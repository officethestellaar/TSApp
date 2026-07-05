'use client';

import MenuManager from '../components/MenuManager';
import { Dumbbell } from 'lucide-react';

export default function GymMenuPage() {
  return (
    <MenuManager
      config={{
        department: 'GYM',
        title: 'Gym Menu',
        icon: Dumbbell,
        categories: ['MEMBERSHIP', 'PT_SESSION', 'GROUP_CLASS', 'EQUIPMENT_RENTAL', 'SUPPLEMENT', 'ASSESSMENT', 'OTHER'],
        gstRate: '18% GST applicable',
        gstNote: 'Gym services are subject to 18% GST. Prices shown are before tax.',
      }}
      screenKey="gym-menu"
    />
  );
}
