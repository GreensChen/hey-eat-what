"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Card, CardContent, CardMedia, CircularProgress, Container, IconButton, Rating, Stack, Typography } from '@mui/material';
import { 
  LocationOn as LocationIcon, 
  Star as StarIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon
} from "@mui/icons-material";

// 餐廳資料介面
interface Restaurant {
  place_id: string;
  name: string;
  vicinity: string;
  rating: number;
  user_ratings_total: number;
  photos?: { photo_reference: string }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  business_status?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  phone?: string;
  address?: string;
  description?: string;
  website?: string;
  travel_time?: string;
}

// 定義是否使用模擬數據
// 在生產環境中應該為 false，這裡設為 false 以使用真實 API
const useMockData = false;

export default function RecommendationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [shownRestaurants, setShownRestaurants] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // 用於開發測試的日誌輸出
  useEffect(() => {
    console.log("shownRestaurants:", shownRestaurants);
  }, [shownRestaurants]);

  // 初始化時從 sessionStorage 載入已顯示的餐廳列表
  useEffect(() => {
    const storedShownRestaurants = sessionStorage.getItem("shownRestaurants");
    if (storedShownRestaurants) {
      setShownRestaurants(JSON.parse(storedShownRestaurants));
    }
  }, []);

  // 當 refreshing 狀態變化時，獲取餐廳數據
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        
        // 獲取用戶位置
        let locationData = null;
        const storedLocation = sessionStorage.getItem("userLocation");
        
        if (storedLocation) {
          locationData = JSON.parse(storedLocation);
        }
        
        if (!locationData) {
          setError("無法獲取位置信息，請返回首頁重試");
          setLoading(false);
          return;
        }
        
        // 獲取當前已顯示的餐廳列表
        const currentShownRestaurants = sessionStorage.getItem("shownRestaurants");
        const excludeIds = currentShownRestaurants ? JSON.parse(currentShownRestaurants) : [];
        
        // 構建 URL 參數
        const excludeParam = JSON.stringify(excludeIds);
        
        // 呼叫基於位置的餐廳推薦 API
        const url = `/api/location-based-restaurants?lat=${locationData.latitude}&lng=${locationData.longitude}&excludeIds=${encodeURIComponent(excludeParam)}&count=3`;
        console.log("請求基於位置的餐廳推薦 API:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`無法獲取餐廳資料: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("基於位置的餐廳推薦 API 回應:", data);
        
        // 檢查是否有營業時間數據
        if (data.restaurants && data.restaurants.length > 0) {
          console.log("第一個餐廳詳細數據:", JSON.stringify(data.restaurants[0], null, 2));
          console.log("營業時間數據:", data.restaurants[0].opening_hours);
          // 使用新的 API 返回的餐廳數據
          // 新的 API 已經返回了隨機選擇的 3 間餐廳，不需要再進行隨機選擇
          const restaurantsWithDetails = data.restaurants;
          
          console.log('已獲取隨機餐廳數據:', restaurantsWithDetails);
          // 檢查餐廳是否有營業時間數據
          console.log("包含詳細資訊的餐廳:", restaurantsWithDetails.map((r: Restaurant) => ({
            name: r.name,
            opening_hours: r.opening_hours
          })));
          
          // 設置餐廳列表
          setRestaurants(restaurantsWithDetails);
          
          // 更新已顯示的餐廳列表
          const newShownRestaurants = [...excludeIds, ...restaurantsWithDetails.map((r: Restaurant) => r.place_id)];
          setShownRestaurants(newShownRestaurants);
          sessionStorage.setItem("shownRestaurants", JSON.stringify(newShownRestaurants));
        } else {
          setError("附近沒有找到餐廳，請嘗試其他位置");
        }
      } catch (err) {
        console.error("獲取餐廳時出錯:", err);
        // 改進錯誤處理，顯示更詳細的錯誤信息
        if (err instanceof Error) {
          setError(`獲取餐廳時出錯: ${err.message}`);
        } else if (typeof err === 'object' && err !== null) {
          // 如果錯誤是一個對象，嘗試提取更多信息
          try {
            const errorStr = JSON.stringify(err);
            setError(`獲取餐廳時出錯: ${errorStr}`);
          } catch {
            setError("獲取餐廳時出錯，請稍後再試");
          }
        } else {
          setError(`獲取餐廳時出錯: ${String(err)}`);
        }
        
        // 檢查環境變數配置
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.warn("Supabase 環境變數未配置，將使用模擬數據");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    
    fetchRestaurants();
  }, [refreshing]);
  
  // 注意: 新的基於位置的餐廳推薦 API 已經返回智能推薦的餐廳，不再需要額外的處理
  
  // 處理「再抽一次」按鈕點擊
  const handleRefresh = () => {
    setRefreshing(true);
  };
  
  // 處理「返回首頁」按鈕點擊
  const handleBackToHome = () => {
    router.push("/");
  };
  
  // 處理點擊餐廳卡片，開啟 Google Maps 導航
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenMaps = (restaurant: Restaurant) => {
    // 按照指南構建導航鏈接
    // 正確格式: https://www.google.com/maps/dir/?api=1&destination=餐廳名稱&destination_place_id=place_id
    const destination = encodeURIComponent(restaurant.name);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${restaurant.place_id}`;
    // 使用 window.location.href 替代 window.open()，避免開啟新分頁
    window.location.href = mapsUrl;
  };
  
  // 處理點擊餐廳資訊區域，開啟 Google 店家資訊頁面
  const handleOpenPlaceDetails = (restaurant: Restaurant, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止事件冒泡
    // 構建 Google 地圖店家頁面鏈接
    // 正確格式: https://www.google.com/maps/place/?q=餐廳名稱&place_id=餐廳ID
    const placeName = encodeURIComponent(restaurant.name);
    const placeUrl = `https://www.google.com/maps/place/?q=${placeName}&place_id=${restaurant.place_id}`;
    // 使用 window.location.href 替代 window.open()，避免開啟新分頁
    window.location.href = placeUrl;
  };
  
  // 預設餐廳照片 URL
  const defaultFoodImage = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=160&fit=crop&auto=format";
  
  // 獲取餐廳照片 URL - 使用新的 API 路徑
  const getPhotoUrl = (photoReference: string) => {
    if (!photoReference) {
      return defaultFoodImage;
    }
    
    // 如果使用模擬數據，則返回預設圖片
    if (useMockData) {
      // 使用穩定的 Unsplash 圖片作為模擬數據
      const mockImages = [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=160&fit=crop&auto=format",
        "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=160&fit=crop&auto=format",
        "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=160&fit=crop&auto=format",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=160&fit=crop&auto=format",
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=160&fit=crop&auto=format"
      ];
      // 根據 photoReference 的最後一個字符選擇一個模擬圖片
      const index = parseInt(photoReference.slice(-1), 16) % mockImages.length;
      return mockImages[index];
    }
    
    // 加入亂數避免快取問題
    return `/api/places/photo?photo_reference=${photoReference}&random=${Math.random()}`;
  };
  
  // 照片載入錯誤處理
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    event.currentTarget.src = defaultFoodImage;
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", mt: -2.5 }}>
        <Box textAlign="center">
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6">正在尋找美食...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <Box textAlign="center" sx={{ mb: 4 }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleBackToHome} 
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2, mr: 2 }}
          >
            返回首頁
          </Button>
          <Button 
            variant="contained" 
            onClick={handleRefresh} 
            startIcon={<RefreshIcon />}
            sx={{ mt: 2 }}
          >
            再試一次
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "100%", mt: -2.5 }}>
        <IconButton 
          onClick={handleBackToHome} 
          sx={{ position: "absolute", left: 0 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontSize: 'calc(1.5rem - 4px)', 
            fontWeight: "bold",
            flexGrow: 1,
            textAlign: "center"
          }}
        >
          不然就這幾間？
        </Typography>
      </Box>
      
      {restaurants.length > 0 ? (
        <>
          <Stack spacing={3}>
            {restaurants.map((restaurant) => (
              <Card 
                key={restaurant.place_id} 
                elevation={3} 
                sx={{ 
                  borderRadius: 2,
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'auto',
                  "&:hover": {
                    transform: "translateY(-4px)"
                  }
                }}
                onClick={(e) => handleOpenPlaceDetails(restaurant, e)}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: '160px',
                    width: '100%',
                    backgroundColor: '#f0f0f0',
                    overflow: 'hidden'
                  }}
                >
                  <CardMedia
                    component="img"
                    height="160"
                    sx={{
                      width: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      aspectRatio: '16/9',
                      transition: 'opacity 0.3s ease-in-out'
                    }}
                    image={restaurant.photos && restaurant.photos.length > 0 
                      ? getPhotoUrl(restaurant.photos[0].photo_reference)
                      : defaultFoodImage}
                    alt={restaurant.name}
                    onError={handleImageError}
                    loading="eager" // 改為 eager 來確保優先加載
                  />
                </Box>
                <CardContent 
                  sx={{ flexGrow: 1, pb: 0, mb: 0, cursor: 'pointer' }}
                  onClick={(e) => handleOpenPlaceDetails(restaurant, e)}
                >
                  <Typography variant="h6" gutterBottom noWrap sx={{ fontWeight: 'bold' }}>
                    {restaurant.name}
                  </Typography>
                  
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Rating 
                      value={restaurant.rating || 0} 
                      precision={0.1} 
                      readOnly 
                      size="small"
                      emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {restaurant.rating || "無評分"} 
                      {restaurant.user_ratings_total ? `(${restaurant.user_ratings_total})` : ""}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
                    <LocationIcon fontSize="small" color="action" sx={{ mt: 0.3, mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {restaurant.vicinity}
                    </Typography>
                  </Box>
                  
                  {/* 營業時間資訊已移除 */}
                </CardContent>
                <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                  <Button 
                    variant="text" 
                    color="primary" 
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPlaceDetails(restaurant, e);
                    }}
                    sx={{ 
                      textAlign: 'center',
                      justifyContent: 'center',
                      borderRadius: 0,
                      pt: 1
                    }}
                  >
                    就決定是你了！
                  </Button>
                </Box>
              </Card>
            ))}
          </Stack>
          
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ 
                py: 1.5, 
                px: 4, 
                borderRadius: 8,
                fontSize: "1.1rem",
                boxShadow: 2
              }}
            >
              {refreshing ? <CircularProgress size={24} color="inherit" /> : "我不要"}
            </Button>
          </Box>
        </>
      ) : (
        <Box textAlign="center" sx={{ my: 8 }}>
          <Typography variant="h6" gutterBottom>
            沒有找到餐廳
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            附近沒有找到餐廳，請嘗試其他位置或再試一次
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleRefresh} 
            startIcon={<RefreshIcon />}
          >
            再試一次
          </Button>
        </Box>
      )}
    </Container>
  );
}
