"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardMedia, 
  CircularProgress,
  Collapse, 
  Container, 
  IconButton, 
  Rating, 
  Stack, 
  Typography 
} from "@mui/material";
import { 
  LocationOn as LocationIcon, 
  Star as StarIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  AccessTime as AccessTimeIcon
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

export default function RecommendationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [shownRestaurants, setShownRestaurants] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // 獲取餐廳詳細資訊的函數
  const getPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(`/api/places/details?placeId=${placeId}`);
      
      if (!response.ok) {
        throw new Error(`獲取餐廳詳細資訊失敗: ${response.status}`);
      }
      
      const data = await response.json();
      return data.details;
    } catch (error) {
      console.error('獲取餐廳詳細資訊時出錯:', error);
      return null;
    }
  };
  
  // 將英文星期轉換為中文星期
  const convertWeekdayToChinese = (weekdayText: string) => {
    return weekdayText
      .replace('Monday', '星期一')
      .replace('Tuesday', '星期二')
      .replace('Wednesday', '星期三')
      .replace('Thursday', '星期四')
      .replace('Friday', '星期五')
      .replace('Saturday', '星期六')
      .replace('Sunday', '星期日');
  };
  
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
        const locationParam = `${locationData.lat},${locationData.lng}`;
        const excludeParam = JSON.stringify(excludeIds);
        
        // 呼叫 API 獲取餐廳資料
        const url = `/api/places/nearby?location=${encodeURIComponent(locationParam)}&excludePlaceIds=${encodeURIComponent(excludeParam)}`;
        console.log("請求 URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`無法獲取餐廳資料: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API 回應:", data);
        
        // 檢查是否有營業時間數據
        if (data.restaurants && data.restaurants.length > 0) {
          console.log("第一個餐廳詳細數據:", JSON.stringify(data.restaurants[0], null, 2));
          console.log("營業時間數據:", data.restaurants[0].opening_hours);
          // 隨機選擇 3 間餐廳
          const randomRestaurants = getRandomRestaurants(data.restaurants, 3);
          
          // 為每個餐廳獲取詳細資訊
          console.log('為餐廳獲取詳細資訊...');
          const restaurantsWithDetails = await Promise.all(
            randomRestaurants.map(async (restaurant) => {
              // 如果餐廳已經有營業時間數據，則不需要再次獲取
              if (restaurant.opening_hours?.weekday_text) {
                console.log(`餐廳 ${restaurant.name} 已有營業時間數據，無需再次獲取`);
                return restaurant;
              }
              
              console.log(`為餐廳 ${restaurant.name} 獲取詳細資訊...`);
              const details = await getPlaceDetails(restaurant.place_id);
              
              if (!details) {
                console.log(`無法獲取餐廳 ${restaurant.name} 的詳細資訊`);
                return restaurant;
              }
              
              console.log(`成功獲取餐廳 ${restaurant.name} 的詳細資訊:`, details);
              
              // 合併餐廳資訊與詳細資訊
              return {
                ...restaurant,
                business_status: details.business_status || restaurant.business_status,
                opening_hours: details.opening_hours ? {
                  open_now: details.opening_hours.open_now,
                  weekday_text: details.opening_hours.weekday_text
                } : restaurant.opening_hours
              };
            })
          );
          
          // 檢查餐廳是否有營業時間數據
          console.log("包含詳細資訊的餐廳:", restaurantsWithDetails.map(r => ({
            name: r.name,
            opening_hours: r.opening_hours
          })));
          
          // 設置餐廳列表
          setRestaurants(restaurantsWithDetails);
          
          // 更新已顯示餐廳列表
          const newShownIds = [
            ...excludeIds,
            ...restaurantsWithDetails.map(r => r.place_id)
          ];
          setShownRestaurants(newShownIds);
          sessionStorage.setItem("shownRestaurants", JSON.stringify(newShownIds));
        } else {
          setError("附近沒有找到餐廳，請嘗試其他位置");
        }
      } catch (err) {
        console.error("獲取餐廳時出錯:", err);
        setError("獲取餐廳時出錯，請稍後再試");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    
    fetchRestaurants();
  }, [refreshing]);
  
  // 隨機選擇指定數量的餐廳
  const getRandomRestaurants = (restaurants: Restaurant[], count: number) => {
    // 如果餐廳列表數量小於等於要求的數量，直接返回全部
    if (restaurants.length <= count) {
      return restaurants;
    }
    
    // 隨機打亂餐廳列表並選擇指定數量
    const shuffled = [...restaurants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };
  
  // 處理「再抽一次」按鈕點擊
  const handleRefresh = () => {
    setRefreshing(true);
  };
  
  // 處理「返回首頁」按鈕點擊
  const handleBackToHome = () => {
    router.push("/");
  };
  
  // 處理點擊餐廳卡片，開啟 Google Maps 導航
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
  
  // 獲取餐廳照片 URL - 使用新的 API 路徑
  const getPhotoUrl = (photoReference: string) => {
    return `/api/places/photo?photo_reference=${photoReference}`;
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
                <CardMedia
                  component="img"
                  height="160"
                  sx={{
                    width: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    aspectRatio: '16/9'
                  }}
                  image={restaurant.photos && restaurant.photos.length > 0 
                    ? getPhotoUrl(restaurant.photos[0].photo_reference)
                    : "https://via.placeholder.com/400x160?text=沒有照片"}
                  alt={restaurant.name}
                />
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
                  
                  {/* 打印營業時間數據以進行調試 */}
                  <Box sx={{ display: 'none' }}>
                    {(() => {
                      console.log('餐廳營業時間數據:', restaurant.name, restaurant.opening_hours);
                      return null;
                    })()}
                  </Box>
                  
                  {restaurant.opening_hours ? (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <AccessTimeIcon fontSize="small" color="action" sx={{ mt: 0.3, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: restaurant.opening_hours.open_now ? 'primary.main' : 'text.secondary' }}>
                          {restaurant.opening_hours.open_now ? '營業中' : '休息中'}
                        </Typography>
                      </Box>
                      
                      {restaurant.opening_hours.weekday_text ? (
                        <Collapse in={true}>
                          <Box sx={{ pl: 3, borderLeft: '1px solid #eee', ml: 0.5 }}>
                            {restaurant.opening_hours.weekday_text.map((day, index) => {
                              // 將英文星期轉換為中文星期
                              const chineseDay = convertWeekdayToChinese(day);
                              const [weekday, hours] = chineseDay.split(': ');
                              
                              return (
                                <Box key={index} sx={{ display: 'flex', mb: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mr: 1, minWidth: '45px' }}>
                                    {weekday}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', flexGrow: 1 }}>
                                    {hours}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        </Collapse>
                      ) : null}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      無營業時間資訊
                    </Typography>
                  )}
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
