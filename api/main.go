package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "net/url"
    "os"
    "path/filepath"
    "strings"
    "time"
)

var (
    kijaniBase    string
    kijaniAPIKey  string
    kijaniToken   string
    kijaniUser    string
    kijaniPass    string
)

func main() {
    kijaniBase = os.Getenv("KIJANI_API_BASE")
    if kijaniBase == "" {
        kijaniBase = "https://api.kijanispace.eu"
    }
    kijaniAPIKey = os.Getenv("KIJANI_API_KEY")
    kijaniToken = os.Getenv("KIJANI_ACCESS_TOKEN")
    kijaniUser = os.Getenv("KIJANI_USERNAME")
    kijaniPass = os.Getenv("KIJANI_PASSWORD")

    if kijaniAPIKey == "" && kijaniToken == "" && kijaniUser == "" && kijaniPass == "" {
        log.Printf("warning: no Kijanispace auth configured; set KIJANI_API_KEY or KIJANI_USERNAME/KIJANI_PASSWORD in .env")
    }

    if kijaniToken == "" && kijaniUser != "" && kijaniPass != "" {
        token, err := loginKijani(kijaniUser, kijaniPass)
        if err != nil {
            log.Printf("warning: failed to obtain Kijanibox token: %v", err)
        } else {
            kijaniToken = token
        }
    }

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("ok"))
    })
    http.HandleFunc("/api/locations", handleLocations)
    http.HandleFunc("/api/stac", handleProxyStac)
    http.HandleFunc("/api/stac-search", handleSTACSearch)
    http.HandleFunc("/api/water-metrics", handleWaterMetrics)
    http.HandleFunc("/detect", handleDetect)

    fs := http.FileServer(http.Dir(filepath.Join("frontend")))
    http.Handle("/", fs)

    addr := ":8080"
    log.Printf("API listening on %s", addr)
    log.Fatal(http.ListenAndServe(addr, nil))
}

func loginKijani(username, password string) (string, error) {
    loginURL := kijaniBase + "/v1/auth/login"
    body := map[string]string{"email": username, "password": password}
    jb, _ := json.Marshal(body)
    req, err := http.NewRequest("POST", loginURL, bytes.NewReader(jb))
    if err != nil {
        return "", err
    }
    req.Header.Set("Content-Type", "application/json")
    client := &http.Client{Timeout: 15 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    bodyBytes, _ := io.ReadAll(resp.Body)
    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("login failed %d: %s", resp.StatusCode, strings.TrimSpace(string(bodyBytes)))
    }
    var data struct {
        AccessToken string `json:"access_token"`
    }
    if err := json.Unmarshal(bodyBytes, &data); err != nil {
        return "", err
    }
    return data.AccessToken, nil
}

func authHeader(req *http.Request) {
    if kijaniAPIKey != "" {
        req.Header.Set("X-API-Key", kijaniAPIKey)
        q := req.URL.Query()
        if q.Get("api_key") == "" {
            q.Set("api_key", kijaniAPIKey)
            req.URL.RawQuery = q.Encode()
        }
    } else if kijaniToken != "" {
        req.Header.Set("Authorization", "Bearer "+kijaniToken)
    }
}

func hasAuth() bool {
    return kijaniAPIKey != "" || kijaniToken != ""
}

func proxyKijani(method, path string, body io.Reader) (*http.Response, error) {
    path = strings.TrimLeft(path, "/")
    queryIndex := strings.Index(path, "?")
    target := kijaniBase + "/v1/eo/stac/"
    if queryIndex >= 0 {
        target += path[:queryIndex]
    } else {
        target += path
    }
    req, err := http.NewRequest(method, target, body)
    if err != nil {
        return nil, err
    }
    if body != nil {
        req.Header.Set("Content-Type", "application/json")
    }
    if queryIndex >= 0 {
        req.URL.RawQuery = path[queryIndex+1:]
    }
    authHeader(req)
    log.Printf("proxy %s %s", method, req.URL.String())
    return http.DefaultClient.Do(req)
}

func proxyKijaniPath(method, path string, body io.Reader) (*http.Response, error) {
    if !strings.HasPrefix(path, "/") {
        path = "/" + path
    }
    target := kijaniBase + path
    req, err := http.NewRequest(method, target, body)
    if err != nil {
        return nil, err
    }
    if body != nil {
        req.Header.Set("Content-Type", "application/json")
    }
    authHeader(req)
    log.Printf("proxy %s %s", method, req.URL.String())
    return http.DefaultClient.Do(req)
}

func handleLocations(w http.ResponseWriter, r *http.Request) {
    if !hasAuth() {
        http.Error(w, "no Kijanispace credentials configured", http.StatusInternalServerError)
        return
    }
    url := kijaniBase + "/v1/eo/locations"
    req, err := http.NewRequest("GET", url, nil)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    authHeader(req)
    log.Printf("proxy GET %s", url)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
    copyResponse(w, resp)
}

func handleProxyStac(w http.ResponseWriter, r *http.Request) {
    if !hasAuth() {
        http.Error(w, "no Kijanispace credentials configured", http.StatusInternalServerError)
        return
    }
    path := r.URL.Query().Get("path")
    if path == "" {
        http.Error(w, "missing path param", http.StatusBadRequest)
        return
    }
    var body io.Reader
    if r.Body != nil {
        buf, err := io.ReadAll(r.Body)
        if err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
        if len(buf) > 0 {
            body = bytes.NewReader(buf)
        }
    }
    resp, err := proxyKijani(r.Method, path, body)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
    copyResponse(w, resp)
}

func handleSTACSearch(w http.ResponseWriter, r *http.Request) {
    if r.Method != "GET" {
        http.Error(w, "GET required", http.StatusMethodNotAllowed)
        return
    }
    if !hasAuth() {
        http.Error(w, "no Kijanispace credentials configured", http.StatusInternalServerError)
        return
    }
    collection := r.URL.Query().Get("collection")
    if collection == "" {
        collection = "Kisumu"
    }
    bboxParam := r.URL.Query().Get("bbox")
    if bboxParam == "" {
        bboxParam = "33.5,-1.0,35.0,0.8"
    }
    limit := r.URL.Query().Get("limit")
    values := url.Values{}
    values.Set("bbox", bboxParam)
    if limit != "" {
        values.Set("limit", limit)
    }
    path := fmt.Sprintf("collections/%s/items?%s", url.PathEscape(collection), values.Encode())
    resp, err := proxyKijani("GET", path, nil)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
    if resp.StatusCode == http.StatusUnauthorized {
        http.Error(w, "Kijanispace auth failed: unauthorized", http.StatusUnauthorized)
        return
    }
    copyResponse(w, resp)
}

func handleWaterMetrics(w http.ResponseWriter, r *http.Request) {
    if r.Method != "GET" {
        http.Error(w, "GET required", http.StatusMethodNotAllowed)
        return
    }
    if !hasAuth() {
        http.Error(w, "no Kijanispace credentials configured", http.StatusInternalServerError)
        return
    }
    lat := r.URL.Query().Get("lat")
    lon := r.URL.Query().Get("lon")
    if lat == "" || lon == "" {
        lat = "-1.0"
        lon = "33.0"
    }
    resp, err := proxyKijaniPath("GET", fmt.Sprintf("/v1/agro_climate/water?lat=%s&lon=%s", url.QueryEscape(lat), url.QueryEscape(lon)), nil)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
    if resp.StatusCode == http.StatusUnauthorized {
        http.Error(w, "Kijanispace auth failed: unauthorized", http.StatusUnauthorized)
        return
    }
    if resp.StatusCode != http.StatusOK {
        copyResponse(w, resp)
        return
    }

    var payload struct {
        Location struct {
            Latitude  float64 `json:"latitude"`
            Longitude float64 `json:"longitude"`
            Timezone  string  `json:"timezone"`
        } `json:"location"`
        StaticData struct {
            Turbidity   float64  `json:"diffuse_attenuation_coefficient_at_490_nm(monthly_climatology)"`
            Chlorophyll *float64 `json:"chlorophyll_a_concentration(8day_climatology)"`
        } `json:"static_data"`
        ForecastData struct {
            Time           []string  `json:"time"`
            Precipitation  []float64 `json:"precipitation"`
            Temperature    []float64 `json:"temperature_mean"`
            Windspeed      []float64 `json:"windspeed_mean"`
        } `json:"forecast_data"`
        Units struct {
            Precipitation string `json:"precipitation"`
            Temperature   string `json:"temperature_mean"`
            Windspeed     string `json:"windspeed_mean"`
            Turbidity     string `json:"diffuse_attenuation_coefficient_at_490_nm"`
            Chlorophyll   string `json:"chlorophyll_a_concentration"`
            Time          string `json:"time"`
        } `json:"units"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
        http.Error(w, "failed to parse water response", http.StatusBadGateway)
        return
    }

    result := map[string]interface{}{
        "location": payload.Location,
        "units": map[string]string{
            "precipitation": payload.Units.Precipitation,
            "temperature": payload.Units.Temperature,
            "windspeed": payload.Units.Windspeed,
            "turbidity": payload.Units.Turbidity,
            "chlorophyll": payload.Units.Chlorophyll,
            "time": payload.Units.Time,
        },
        "data": map[string]interface{}{
            "time": payload.ForecastData.Time,
            "precipitation": payload.ForecastData.Precipitation,
            "temperature": payload.ForecastData.Temperature,
            "windspeed": payload.ForecastData.Windspeed,
            "turbidity": payload.StaticData.Turbidity,
            "chlorophyll": payload.StaticData.Chlorophyll,
        },
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
}

func handleDetect(w http.ResponseWriter, r *http.Request) {
    if r.Method != "POST" {
        http.Error(w, "POST required", http.StatusMethodNotAllowed)
        return
    }
    var body struct {
        ImageURL string `json:"image_url"`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }
    if body.ImageURL == "" {
        http.Error(w, "image_url required", http.StatusBadRequest)
        return
    }
    payload := map[string]string{"image_url": body.ImageURL}
    jb, _ := json.Marshal(payload)
    resp, err := http.Post("http://worker:8081/process", "application/json", bytes.NewReader(jb))
    if err != nil {
        http.Error(w, "worker error: "+err.Error(), http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
    copyResponse(w, resp)
}

func copyResponse(w http.ResponseWriter, resp *http.Response) {
    for k, v := range resp.Header {
        for _, vv := range v {
            w.Header().Add(k, vv)
        }
    }
    w.WriteHeader(resp.StatusCode)
    io.Copy(w, resp.Body)
}
