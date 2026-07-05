'use client';

import MenuManager from '../components/MenuManager';
import { Building2 } from 'lucide-react';

export default function BanquetMenuPage() {
  return (
    <MenuManager
      config={{
        department: 'BANQUET',
        title: 'Banquet Menu',
        icon: Building2,
        categories: ['VENUE', 'CATERING', 'DECORATION', 'AUDIO_VISUAL', 'SECURITY', 'ENTERTAINMENT', 'OTHER'],
        gstRate: '5% GST applicable',
        gstNote: 'Banquet services are subject to 5% GST. Prices shown are before tax.',
      }}
      screenKey="banquet-menu"
    />
  );
}
