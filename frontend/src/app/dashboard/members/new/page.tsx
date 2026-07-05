'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { UserPlus, Users, IndianRupee, CheckCircle, ChevronRight, ChevronLeft, Save, XCircle, ShieldCheck, Upload, FileText } from 'lucide-react';

interface FamilyMemberFormData {
  name: string;
  relation: string;
  dob: string;
  gender: string;
  mobileNumber: string;
}

interface MemberFormData {
  category: string;
  tenure: string;
  nameAsAadhaar: string;
  fatherHusbandName: string;
  gender: string;
  dob: string;
  maritalStatus: string;
  occupation: string;
  aadhaarNumber: string;
  panNumber: string;
  mobileNumber: string;
  email: string;
  password?: string;
  residentialAddress: string;
  city: string;
  state: string;
  pincode: string;
  nationality: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  familyMembers: FamilyMemberFormData[];
  offerPrice: number;
  membershipFee: number;
  registrationFee: number;
  discountAmount: number;
  netAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentMode: string;
  paymentRef: string;
  startDate: string;
  expiryDate: string;
}

const STEPS = [
  { id: 1, title: 'Primary Details', icon: UserPlus },
  { id: 2, title: 'Family Members', icon: Users },
  { id: 3, title: 'Financials', icon: IndianRupee },
  { id: 4, title: 'Verification', icon: ShieldCheck },
  { id: 5, title: 'Review', icon: CheckCircle },
];

export default function NewMemberPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<MemberFormData>({
    category: 'BLUE',
    tenure: '1_YEAR',
    nameAsAadhaar: '',
    fatherHusbandName: '',
    gender: 'MALE',
    dob: '',
    maritalStatus: 'SINGLE',
    occupation: '',
    aadhaarNumber: '',
    panNumber: '',
    mobileNumber: '',
    email: '',
    password: '',
    residentialAddress: '',
    city: '',
    state: '',
    pincode: '',
    nationality: 'INDIAN',
    bloodGroup: 'A+',
    emergencyContactName: '',
    emergencyContactNumber: '',
    familyMembers: [],
    offerPrice: 0,
    membershipFee: 0,
    registrationFee: 0,
    discountAmount: 0,
    netAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    paymentMode: 'CASH',
    paymentRef: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
  });

  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-update tenure based on category
      if (name === 'category') {
        if (value === 'DAY_VISITOR') updated.tenure = '1_DAY';
        else if (value === 'BLUE') updated.tenure = '1_YEAR';
        else if (value === 'SILVER') updated.tenure = '3_YEAR';
        else if (value === 'GOLD') updated.tenure = '5_YEAR';
      }
      
      return updated;
    });
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      const required = [
        'nameAsAadhaar', 'mobileNumber', 'email', 'dob', 'gender', 
        'category', 'residentialAddress', 'city', 'pincode', 
        'aadhaarNumber', 'emergencyContactNumber'
      ];
      const missing = required.filter(field => !formData[field as keyof MemberFormData]);
      if (missing.length > 0) {
        alert('Please fill all required fields.');
        return false;
      }
      
      // Basic email validation
      if (!formData.email.includes('@')) {
        alert('Invalid email address.');
        return false;
      }
      
      // Basic mobile/aadhaar/emergency validation
      const isNumeric = (val: string) => /^\d+$/.test(val);

      if (formData.mobileNumber.length !== 10 || !isNumeric(formData.mobileNumber)) {
        alert('Mobile number must be 10 digits.');
        return false;
      }
      if (formData.aadhaarNumber.length !== 12 || !isNumeric(formData.aadhaarNumber)) {
        alert('Aadhaar number must be 12 digits.');
        return false;
      }
      if (formData.emergencyContactNumber.length !== 10 || !isNumeric(formData.emergencyContactNumber)) {
        alert('Emergency contact must be 10 digits.');
        return false;
      }
      if (formData.pincode.length !== 6 || !isNumeric(formData.pincode)) {
        alert('Pincode must be 6 digits.');
        return false;
      }
    }

    if (step === 4) {
      if (!formData.paymentRef && !proofFile) {
        alert('Please provide a transaction reference or upload a payment proof.');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    try {
      const data = { ...formData };
      if (!data.expiryDate && data.startDate) {
        const exp = new Date(data.startDate);
        if (data.category === 'DAY_VISITOR') exp.setHours(exp.getHours() + 24);
        else if (data.category === 'SILVER') exp.setFullYear(exp.getFullYear() + 3);
        else if (data.category === 'GOLD') exp.setFullYear(exp.getFullYear() + 5);
        else exp.setFullYear(exp.getFullYear() + 1);
        data.expiryDate = exp.toISOString().split('T')[0];
      }
      
      const payload = new FormData();
      payload.append('data', JSON.stringify(data));
      if (proofFile) {
        payload.append('proof', proofFile);
      }

      const response = await api.post('members', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`Member Registered Successfully.\n\nMembership Number: ${response.data.membershipNumber}\n\nLogin Email: ${formData.email}\nDefault Password: TheStellaarMember`);
      router.push('/dashboard/members');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-navy italic">New Member Registration</h1>
          <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60 mt-2">Fill in the details below</p>
        </header>

        <div className="flex items-center justify-between mb-16 glass-panel p-6 rounded-[2rem] shadow-xl">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className={`flex flex-col items-center ${isActive ? 'text-gold' : isCompleted ? 'text-green-500' : 'text-slate/40'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'border-gold bg-gold/10 shadow-lg shadow-gold/20' : isCompleted ? 'border-green-500 bg-green-50' : 'border-slate/10 bg-white/50'}`}>
                    {isCompleted ? <CheckCircle size={24} /> : <Icon size={24} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-3">{step.title}</span>
                </div>
                {step.id < STEPS.length && (
                  <div className={`h-0.5 flex-1 mx-6 ${isCompleted ? 'bg-green-500' : 'bg-slate/10'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-navy/5 border border-navy/[0.03] overflow-hidden">
          <div className="p-12">
            {currentStep === 1 && (
              <div className="space-y-10">
                <h3 className="text-2xl font-serif font-bold text-navy border-b border-navy/5 pb-4 italic">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Full Name <span className="text-red-500">*</span></label>
                    <input name="nameAsAadhaar" value={formData.nameAsAadhaar} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="Rahul Sharma" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Father/Husband Name</label>
                    <input name="fatherHusbandName" value={formData.fatherHusbandName} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="S/O or W/O Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Mobile Number <span className="text-red-500">*</span></label>
                    <input name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="9876543210" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Email Address <span className="text-red-500">*</span></label>
                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="rahul@stellaar.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Date of Birth <span className="text-red-500">*</span></label>
                    <input name="dob" type="date" value={formData.dob} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Gender <span className="text-red-500">*</span></label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Marital Status</label>
                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy">
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                      <option value="DIVORCED">Divorced</option>
                      <option value="WIDOWED">Widowed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Occupation</label>
                    <input name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="E.g., Business, Salaried, Doctor" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Membership Tier <span className="text-red-500">*</span></label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy">
                      <option value="DAY_VISITOR">Day Visitor (1-Day Pass)</option>
                      <option value="BLUE">Blue Membership</option>
                      <option value="SILVER">Silver Membership</option>
                      <option value="GOLD">Gold Membership</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Residential Address <span className="text-red-500">*</span></label>
                    <textarea name="residentialAddress" value={formData.residentialAddress} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" rows={3} placeholder="Full residency details..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">City <span className="text-red-500">*</span></label>
                    <input name="city" value={formData.city} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Pincode <span className="text-red-500">*</span></label>
                    <input name="pincode" value={formData.pincode} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="000000" maxLength={6} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Aadhaar Number <span className="text-red-500">*</span></label>
                    <input name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="1234 5678 9012" maxLength={12} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Emergency Contact Number <span className="text-red-500">*</span></label>
                    <input name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" placeholder="Emergency Number" maxLength={10} />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-10">
                <div className="flex justify-between items-center border-b border-navy/5 pb-4">
                  <h3 className="text-2xl font-serif font-bold text-navy italic">Family Members</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newMember: FamilyMemberFormData = { name: '', relation: 'SPOUSE', dob: '', gender: 'FEMALE', mobileNumber: '' };
                      setFormData((prev) => ({ ...prev, familyMembers: [...prev.familyMembers, newMember] }));
                    }}
                    className="text-[10px] font-black uppercase tracking-widest bg-gold/10 text-gold px-6 py-2.5 rounded-xl hover:bg-gold/20 transition-all flex items-center gap-2 border border-gold/20"
                  >
                    <UserPlus size={16} /> Add Family Member
                  </button>
                </div>
                
                <div className="space-y-6">
                  {formData.familyMembers.length === 0 ? (
                    <div className="text-center py-24 border-2 border-dashed rounded-[2rem] border-navy/5 text-slate/40 font-bold uppercase tracking-widest text-xs">
                      No family members added yet.
                    </div>
                  ) : (
                    formData.familyMembers.map((member, index: number) => (
                      <div key={index} className="p-8 border border-navy/5 rounded-[2rem] bg-navy/[0.01] relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 group hover:border-gold/30 transition-all duration-500">
                        <button
                          type="button"
                          onClick={() => {
                            const newMembers = [...formData.familyMembers];
                            newMembers.splice(index, 1);
                            setFormData((prev) => ({ ...prev, familyMembers: newMembers }));
                          }}
                          className="absolute -top-3 -right-3 bg-white text-red-500 rounded-full shadow-lg p-1.5 hover:bg-red-500 hover:text-white transition-all border border-red-100"
                        >
                          <XCircle size={24} />
                        </button>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate uppercase tracking-widest">Full Name</label>
                          <input className="w-full p-3 bg-white border border-navy/5 rounded-xl text-sm font-bold text-navy outline-none focus:border-gold" value={member.name} onChange={(e) => {
                            const newMembers = [...formData.familyMembers];
                            newMembers[index].name = e.target.value;
                            setFormData((prev) => ({ ...prev, familyMembers: newMembers }));
                          }} placeholder="Name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate uppercase tracking-widest">Relation</label>
                          <select className="w-full p-3 bg-white border border-navy/5 rounded-xl text-sm font-bold text-navy outline-none focus:border-gold" value={member.relation} onChange={(e) => {
                            const newMembers = [...formData.familyMembers];
                            newMembers[index].relation = e.target.value;
                            setFormData((prev) => ({ ...prev, familyMembers: newMembers }));
                          }}>
                            <option value="SPOUSE">Spouse</option>
                            <option value="SON">Son</option>
                            <option value="DAUGHTER">Daughter</option>
                            <option value="FATHER">Father</option>
                            <option value="MOTHER">Mother</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate uppercase tracking-widest">DOB</label>
                          <input type="date" className="w-full p-3 bg-white border border-navy/5 rounded-xl text-sm font-bold text-navy outline-none focus:border-gold" value={member.dob} onChange={(e) => {
                            const newMembers = [...formData.familyMembers];
                            newMembers[index].dob = e.target.value;
                            setFormData((prev) => ({ ...prev, familyMembers: newMembers }));
                          }} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate uppercase tracking-widest">Gender</label>
                          <select className="w-full p-3 bg-white border border-navy/5 rounded-xl text-sm font-bold text-navy outline-none focus:border-gold" value={member.gender} onChange={(e) => {
                            const newMembers = [...formData.familyMembers];
                            newMembers[index].gender = e.target.value;
                            setFormData((prev) => ({ ...prev, familyMembers: newMembers }));
                          }}>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate uppercase tracking-widest">Mobile Number</label>
                          <input className="w-full p-3 bg-white border border-navy/5 rounded-xl text-sm font-bold text-navy outline-none focus:border-gold" value={member.mobileNumber} onChange={(e) => {
                            const newMembers = [...formData.familyMembers];
                            newMembers[index].mobileNumber = e.target.value;
                            setFormData((prev) => ({ ...prev, familyMembers: newMembers }));
                          }} placeholder="Mobile" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-10">
                <h3 className="text-2xl font-serif font-bold text-navy border-b border-navy/5 pb-4 italic">Fees & Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Membership Period</label>
                    <select name="tenure" value={formData.tenure} disabled className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl outline-none font-bold text-navy opacity-70 cursor-not-allowed">
                      <option value="1_DAY">1 Day Pass (Visitor)</option>
                      <option value="1_YEAR">1 Year Residency (Blue)</option>
                      <option value="3_YEAR">3 Year Residency (Silver)</option>
                      <option value="5_YEAR">5 Year Residency (Gold)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Start Date</label>
                    <input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Membership Fee (₹)</label>
                    <input name="membershipFee" type="number" value={formData.membershipFee} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Payment Method</label>
                    <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy">
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-10">
                <h3 className="text-2xl font-serif font-bold text-navy border-b border-navy/5 pb-4 italic">Payment Details</h3>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Transaction ID / UPI ID / Cheque Number <span className="text-navy/40 font-medium italic">(One document required)</span></label>
                    <input 
                      name="paymentRef" 
                      value={formData.paymentRef} 
                      onChange={handleInputChange} 
                      className="w-full p-4 bg-navy/5 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy" 
                      placeholder="E.g., UPI-123456789 or CHQ-000123" 
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate uppercase tracking-[0.2em]">Upload Payment Proof (Photo/PDF) <span className="text-navy/40 font-medium italic">(One document required)</span></label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        accept="image/*,.pdf"
                      />
                      <div className="border-2 border-dashed border-navy/10 rounded-[2rem] p-12 text-center group-hover:border-gold transition-colors bg-navy/[0.01]">
                        {proofFile ? (
                          <div className="flex items-center justify-center gap-4 text-green-600 font-bold">
                            <FileText size={40} />
                            <div className="text-left">
                               <p className="text-sm">{proofFile.name}</p>
                               <p className="text-[10px] uppercase opacity-60">File Attached</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 text-slate/40">
                            <Upload size={48} className="mx-auto opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Click or Drag Payment Proof</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-10">
                <h3 className="text-2xl font-serif font-bold text-navy border-b border-navy/5 pb-4 italic">Review</h3>
                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-slate uppercase tracking-[0.3em]">Full Name</div>
                    <div className="text-lg font-bold text-navy">{formData.nameAsAadhaar || 'Unspecified'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-slate uppercase tracking-[0.3em]">Mobile Number</div>
                    <div className="text-lg font-bold text-navy">{formData.mobileNumber || 'Unspecified'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-slate uppercase tracking-[0.3em]">Membership Tier</div>
                    <div className="text-lg font-bold text-gold tracking-widest uppercase">{formData.category} MEMBERSHIP</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-slate uppercase tracking-[0.3em]">Duration</div>
                    <div className="text-lg font-bold text-navy">{formData.tenure.replace('_', ' ')}</div>
                  </div>
                </div>
                <div className="p-8 bg-gold/5 border border-gold/10 rounded-[2rem] text-navy/70 text-xs font-bold leading-relaxed italic">
                  &ldquo;By submitting, you confirm that all information provided is accurate and legally binding.&rdquo;
                </div>
              </div>
            )}
          </div>

          <div className="bg-navy/[0.02] px-12 py-8 flex justify-between border-t border-navy/[0.05]">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-3 px-8 py-3.5 font-black text-[10px] uppercase tracking-widest text-slate hover:text-navy transition-all disabled:opacity-20"
            >
              <ChevronLeft size={20} />
              Back
            </button>

            {currentStep < STEPS.length ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-3 px-10 py-3.5 bg-navy text-gold font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-navy/20 transition-all hover:-translate-y-1 active:scale-95"
              >
                Next
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-3 px-12 py-3.5 gold-gradient text-navy font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-gold/20 transition-all hover:-translate-y-1 active:scale-95"
              >
                <Save size={20} />
                Submit Registration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
