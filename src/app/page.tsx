"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Typography, Box, Container, CircularProgress } from "@mui/material";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // 請求位置權限
  useEffect(() => {
    if (navigator.geolocation) {
      setLocationPermission("requesting");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationPermission("granted");
        },
        (error) => {
          console.error("位置獲取失敗:", error);
          setLocationPermission("denied");
        }
      );
    } else {
      setLocationPermission("unsupported");
    }
  }, []);

  // 使用預設位置（台北101附近）
  const navigateWithDefaultLocation = () => {
    const defaultCoords = {
      lat: 25.0339639,
      lng: 121.5644722
    };
    sessionStorage.setItem("userLocation", JSON.stringify(defaultCoords));
    router.push("/recommendation");
  };

  // 處理「隨便」按鈕點擊
  const handleRandomClick = () => {
    setLoading(true);
    
    // 如果已經有位置信息，直接導航到推薦頁面
    if (coordinates) {
      // 將座標存儲到 sessionStorage 中，以便在推薦頁面使用
      sessionStorage.setItem("userLocation", JSON.stringify(coordinates));
      router.push("/recommendation");
    } else {
      // 如果沒有位置信息，再次嘗試獲取
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            sessionStorage.setItem("userLocation", JSON.stringify(coords));
            router.push("/recommendation");
          },
          (error) => {
            console.error("位置獲取失敗:", error);
            setLoading(false);
            // 使用預設位置
            navigateWithDefaultLocation();
          }
        );
      } else {
        // 瀏覽器不支持地理位置
        setLoading(false);
        navigateWithDefaultLocation();
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <Box textAlign="center" sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: "bold", mb: 4 }}>
          欸！要吃什麼？
        </Typography>
        
        {locationPermission === "requesting" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
            <CircularProgress size={24} sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              正在請求位置權限...
            </Typography>
          </Box>
        )}
        
        {locationPermission === "denied" && (
          <Typography variant="body2" color="info" sx={{ mb: 2 }}>
            無法獲取您的位置。我們將使用預設位置（台北101附近）為您推薦餐廳。
          </Typography>
        )}
        
        {locationPermission === "unsupported" && (
          <Typography variant="body2" color="info" sx={{ mb: 2 }}>
            您的瀏覽器不支持地理位置功能。我們將使用預設位置（台北101附近）為您推薦餐廳。
          </Typography>
        )}
        
        <Button 
          variant="contained" 
          color="primary" 
          size="large" 
          onClick={handleRandomClick}
          disabled={loading}
          sx={{ 
            mt: 2, 
            py: 1.5, 
            px: 4, 
            borderRadius: 8,
            fontSize: "1.2rem",
            boxShadow: 3
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "隨便"}
        </Button>
      </Box>
    </Container>
  );
}
