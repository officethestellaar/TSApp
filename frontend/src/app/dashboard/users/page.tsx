'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { UserPlus, Shield, Check, X, Clock, Edit, Trash2, Activity, User as UserIcon, Lock, Save, Eye, Pencil, Trash, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { User } from '@/types';
import { useSocket } from '@/context/SocketContext';
import ExportButton from '@/components/ui/ExportButton';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface ScreenDef {
  key: string;
  label: string;
}

interface ScreenPermEntry {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const PROTECTED_ADMINS = ['admin@stellaar.com', 'office.thestellaar@gmail.com'];

const ACTIONS = [
  { key: 'canCreate' as const, label: 'Create', icon: PlusCircle },
  { key: 'canRead' as const, label: 'Read', icon: Eye },
  { key: 'canUpdate' as const, label: 'Update', icon: Pencil },
  { key: 'canDelete' as const, label: 'Delete', icon: Trash },
];

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { socket } = useSocket();
  useAuth();

  // Permission modal state
  const [permUser, setPermUser] = useState<User | null>(null);
  const [permData, setPermData] = useState<Record<string, ScreenPermEntry>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  // Edit modal state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editData, setEditData] = useState({ name: '', email: '', password: '', roleId: '' });
  const [editPermData, setEditPermData] = useState<Record<string, ScreenPermEntry>>({});
  const [allScreens, setAllScreens] = useState<ScreenDef[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('users');
      setUsers(response.data);
    } catch (err: any) {
      setError('Failed to fetch users. You may not have permission.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (socket) {
      socket.on('staff_update', fetchUsers);
      return () => {
        socket.off('staff_update', fetchUsers);
      };
    }
  }, [socket, fetchUsers]);

  const isProtected = (email: string) => PROTECTED_ADMINS.includes(email);

  const handleDelete = async (id: number, email: string) => {
    if (isProtected(email)) {
      toast.error('This admin account cannot be deleted.');
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`users/${id}`);
      setUsers(users.filter((u) => u.id !== id));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleToggleLock = async (id: number, currentlyLocked: boolean, email: string) => {
    if (isProtected(email)) {
      toast.error('This admin account cannot be locked.');
      return;
    }
    try {
      await api.patch(`users/${id}/lock`, { locked: !currentlyLocked });
      setUsers(users.map(u => u.id === id ? { ...u, locked: !currentlyLocked } : u));
      toast.success(currentlyLocked ? 'User unlocked' : 'User locked');
    } catch { toast.error('Failed to update lock status'); }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`users/${id}`, { status });
      setUsers(users.map((u) => u.id === id ? { ...u, status } : u));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const togglePermAction = (screenKey: string, action: keyof ScreenPermEntry) => {
    setPermData(prev => ({
      ...prev,
      [screenKey]: {
        ...prev[screenKey] || { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
        [action]: !(prev[screenKey]?.[action] ?? false),
      },
    }));
  };

  const setAllPermActions = (screenKey: string, value: boolean) => {
    setPermData(prev => ({
      ...prev,
      [screenKey]: { canCreate: value, canRead: value, canUpdate: value, canDelete: value },
    }));
  };

  const openPermModal = async (user: User) => {
    setPermUser(user);
    try {
      const [screensRes, permRes] = await Promise.all([
        api.get('users/screens'),
        api.get(`users/${user.id}/screens/permissions`),
      ]);
      setAllScreens(screensRes.data.allScreens);
      setPermData(permRes.data.permissions || {});
    } catch {
      toast.error('Failed to load permissions');
    }
  };

  const savePermissions = async () => {
    if (!permUser) return;
    setSavingPerms(true);
    try {
      await api.put(`users/${permUser.id}/screens/permissions`, { screens: permData });
      if (editUser?.id === permUser.id) {
        setEditPermData({ ...permData });
      }
      setPermUser(null);
      toast.success('Permissions updated');
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const toggleEditPermAction = (screenKey: string, action: keyof ScreenPermEntry) => {
    setEditPermData(prev => ({
      ...prev,
      [screenKey]: {
        ...prev[screenKey] || { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
        [action]: !(prev[screenKey]?.[action] ?? false),
      },
    }));
  };

  const setEditAllPermActions = (screenKey: string, value: boolean) => {
    setEditPermData(prev => ({
      ...prev,
      [screenKey]: { canCreate: value, canRead: value, canUpdate: value, canDelete: value },
    }));
  };

  const openEditModal = async (user: User) => {
    setEditUser(user);
    setEditData({ name: user.name, email: user.email, password: '', roleId: String(user.roleId) });
    try {
      const [rolesRes, screensRes, permRes] = await Promise.all([
        api.get('users/roles'),
        api.get('users/screens'),
        api.get(`users/${user.id}/screens/permissions`),
      ]);
      setRoles(rolesRes.data);
      setAllScreens(screensRes.data.allScreens);
      setEditPermData(permRes.data.permissions || {});
    } catch {
      toast.error('Failed to load roles');
    }
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const body: any = { name: editData.name, email: editData.email, roleId: Number(editData.roleId) };
      if (editData.password) body.password = editData.password;
      await api.patch(`users/${editUser.id}`, body);
      await api.put(`users/${editUser.id}/screens/permissions`, { screens: editPermData });
      setEditUser(null);
      fetchUsers();
      toast.success('User updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-500">Manage system users, roles, and granular CRUD permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              filename="users"
              headers={['Name', 'Email', 'Role', 'Status', 'Created']}
              rows={users.map(user => [user.name, user.email, user.role?.name || 'USER', user.status, new Date(user.createdAt).toLocaleDateString()])}
            />
            <Link
              href="/dashboard/users/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-all"
            >
              <UserPlus size={20} />
              Add New Staff
            </Link>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No staff users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const protectedAccount = isProtected(user.email);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy shadow-inner">
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-navy">{user.name}</div>
                            {user.staffProfile && (
                              <div className="flex items-center gap-1 text-[9px] font-black text-gold uppercase tracking-widest mt-0.5">
                                 <Activity size={10} /> Profile Linked
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {user.email}
                        {protectedAccount && (
                          <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Protected</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Shield size={12} className="mr-1" />
                          {user.role?.name || 'USER'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          user.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.status === 'PENDING' && <Clock size={12} className="mr-1" />}
                          {user.status === 'APPROVED' && <Check size={12} className="mr-1" />}
                          {user.status === 'REJECTED' && <X size={12} className="mr-1" />}
                          {user.status || 'APPROVED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {user.status === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => handleUpdateStatus(user.id, 'APPROVED')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(user.id, 'REJECTED')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          {!protectedAccount && (
                            <button 
                              onClick={() => openEditModal(user)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit User"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => openPermModal(user)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit CRUD Permissions"
                          >
                            <Shield size={18} />
                          </button>
                          <button 
                            onClick={() => handleToggleLock(user.id, user.locked, user.email)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.locked ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={user.locked ? 'Unlock User' : 'Lock User'}
                          >
                            <Lock size={18} />
                          </button>
                          {!protectedAccount && (
                            <button 
                              onClick={() => handleDelete(user.id, user.email)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
              <p className="text-sm text-gray-500 mt-1">{editUser.name}</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editData.email}
                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Password (leave blank to keep)</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="TheStellaarStaff"
                    value={editData.password}
                    onChange={e => setEditData({ ...editData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editData.roleId}
                    onChange={e => setEditData({ ...editData, roleId: e.target.value })}
                  >
                    {roles.filter((r: any) => r.name !== 'MEMBER').map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Granular Screen Permissions</h3>
                <p className="text-xs text-gray-500 mb-4">
                  For each screen, toggle Create / Read / Update / Delete access. Unchecking all actions removes screen access entirely.
                </p>
                <div className="space-y-2">
                  {allScreens.map((screen) => {
                    const perm = editPermData[screen.key] || { canCreate: false, canRead: false, canUpdate: false, canDelete: false };
                    const anyChecked = perm.canCreate || perm.canRead || perm.canUpdate || perm.canDelete;
                    return (
                      <div key={screen.key} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${anyChecked ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}`}>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-gray-800">{screen.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {ACTIONS.map(action => {
                            const isActive = perm[action.key];
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.key}
                                type="button"
                                onClick={() => toggleEditPermAction(screen.key, action.key)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                title={`${action.label} ${screen.label}`}
                              >
                                <Icon size={12} />
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditAllPermActions(screen.key, !anyChecked)}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                            anyChecked ? 'text-red-500 hover:bg-red-50' : 'text-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          {anyChecked ? 'Clear' : 'All'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditUser(null)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Granular Screen Permissions Modal */}
      {permUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Granular Screen Permissions</h2>
              <p className="text-sm text-gray-500 mt-1">
                Assign Create / Read / Update / Delete permissions for <strong>{permUser.name}</strong>
              </p>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">
                Toggle each action per screen. Unchecking all actions revokes access to that screen.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {allScreens.map((screen) => {
                  const perm = permData[screen.key] || { canCreate: false, canRead: false, canUpdate: false, canDelete: false };
                  const anyChecked = perm.canCreate || perm.canRead || perm.canUpdate || perm.canDelete;
                  return (
                    <div key={screen.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${anyChecked ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{screen.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ACTIONS.map(action => {
                          const isActive = perm[action.key];
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.key}
                              type="button"
                              onClick={() => togglePermAction(screen.key, action.key)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={`${action.label} ${screen.label}`}
                            >
                              <Icon size={13} />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllPermActions(screen.key, !anyChecked)}
                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                          anyChecked ? 'text-red-500 hover:bg-red-50' : 'text-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        {anyChecked ? 'Clear' : 'All'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setPermUser(null)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={savePermissions}
                disabled={savingPerms}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
