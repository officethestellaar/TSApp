'use client';

import MenuManager from '../components/MenuManager';
import { UserCheck } from 'lucide-react';

export default function PersonalTrainerMenuPage() {
  return (
    <MenuManager
      config={{
        department: 'PERSONAL_TRAINER',
        title: 'Personal Trainer Menu',
        icon: UserCheck,
        categories: ['SESSION', 'PACKAGE', 'ASSESSMENT', 'NUTRITION', 'OTHER'],
        gstRate: '18% GST applicable',
        gstNote: 'Personal trainer services are subject to 18% GST. Prices shown are before tax.',
      }}
      screenKey="personal-trainer-menu"
    />
  );
}
