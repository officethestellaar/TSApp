'use client';

import MenuManager from '../components/MenuManager';
import { Waves } from 'lucide-react';

export default function PoolMenuPage() {
  return (
    <MenuManager
      config={{
        department: 'POOL',
        title: 'Swimming Pool Menu',
        icon: Waves,
        categories: ['DAY_PASS', 'SWIM_LESSON', 'LANE_RENTAL', 'CHILDRENS_CLASS', 'PARTY', 'OTHER'],
        gstRate: '18% GST applicable',
        gstNote: 'Pool services are subject to 18% GST. Prices shown are before tax.',
      }}
      screenKey="pool-menu"
    />
  );
}
