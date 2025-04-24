"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  CircularProgress,
  Rating,
  Stack,
  IconButton
} from "@mui/material";
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
}

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
        
        if (data.restaurants && data.restaurants.length > 0) {
          // 隨機選擇 3 間餐廳
          const randomRestaurants = getRandomRestaurants(data.restaurants, 3);
          setRestaurants(randomRestaurants);
          
          // 更新已顯示餐廳列表
          const newShownIds = [
            ...excludeIds,
            ...randomRestaurants.map(r => r.place_id)
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
    // 格式: https://www.google.com/maps/dir/?api=1&destination=餐廳名稱+地址&destination_place_id=place_id
    const destination = encodeURIComponent(`${restaurant.name} ${restaurant.vicinity}`);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${restaurant.place_id}`;
    window.open(mapsUrl, "_blank");
  };
  
  // 獲取餐廳照片 URL - 使用新的 API 路徑
  const getPhotoUrl = (photoReference: string) => {
    return `/api/places/photo?photo_reference=${photoReference}`;
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
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
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "100%" }}>
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
                  "&:hover": {
                    transform: "translateY(-4px)"
                  }
                }}
                onClick={() => handleOpenMaps(restaurant)}
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
                <CardContent sx={{ minHeight: '150px', pb: 0, mb: -2 }}>
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
                  
                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <LocationIcon fontSize="small" color="action" sx={{ mt: 0.3, mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {restaurant.vicinity}
                    </Typography>
                  </Box>
                </CardContent>
                <Box sx={{ px: 2, pb: 2, pt: 0, mt: 0 }}>
                  <Button 
                    variant="text" 
                    color="primary" 
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMaps(restaurant);
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
