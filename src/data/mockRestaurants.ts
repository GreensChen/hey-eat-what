import { Restaurant } from '@/lib/supabase';

// 模擬餐廳數據 - 符合 Supabase Restaurant 接口
export const mockRestaurants: Restaurant[] = [
  {
    place_id: 'mock-place-1',
    name: '鴨泰豐 (信義店)',
    address: '台北市信義區松高路11號',
    rating: 4.7,
    user_ratings_total: 1245,
    photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=160&fit=crop&auto=format',
    lat: 25.0393,
    lng: 121.5677,
    source: 'local' as const
  },
  {
    place_id: 'mock-place-2',
    name: '添好運點心專門店',
    address: '台北市信義區松壽路12號',
    rating: 4.5,
    user_ratings_total: 987,
    photo_url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=160&fit=crop&auto=format',
    lat: 25.0359,
    lng: 121.5672,
    source: 'local' as const
  },
  {
    place_id: 'mock-place-3',
    name: '肉多多火鍋 (台北京站店)',
    address: '台北市大同區承德路一段1號',
    rating: 4.3,
    user_ratings_total: 723,
    photo_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=160&fit=crop&auto=format',
    lat: 25.0477,
    lng: 121.5177,
    source: 'local' as const
  },
  {
    place_id: 'mock-place-4',
    name: '金鋒滑肉飯',
    address: '台北市大安區師大路49巷5號',
    rating: 4.4,
    user_ratings_total: 512,
    photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=160&fit=crop&auto=format',
    lat: 25.0246,
    lng: 121.5286,
    source: 'local' as const
  },
  {
    place_id: 'mock-place-5',
    name: '高記茶餐廳',
    address: '台北市大安區延吉街131巷1號',
    rating: 4.2,
    user_ratings_total: 654,
    photo_url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=160&fit=crop&auto=format',
    lat: 25.0267,
    lng: 121.5329,
    source: 'local' as const
  },
  {
    place_id: 'mock-place-6',
    name: '鬼鬼張鬆肉飯 (台北館前店)',
    address: '台北市中正區館前路8號',
    rating: 4.1,
    user_ratings_total: 789,
    photo_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=160&fit=crop&auto=format',
    lat: 25.0453,
    lng: 121.5151,
    source: 'local' as const
  },
  {
    place_id: 'mock-place-7',
    name: '無老鍋 (台北信義店)',
    address: '台北市信義區松高路11號',
    rating: 4.6,
    user_ratings_total: 932,
    photo_url: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=160&fit=crop&auto=format',
    lat: 25.0394,
    lng: 121.5678,
    source: 'local' as const
  }
];
