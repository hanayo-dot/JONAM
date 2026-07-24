package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

type WatchlistLocation struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	CreatedAt time.Time `json:"created_at"`
}

type RiskReport struct {
	ID               string                 `json:"id"`
	Location         string                 `json:"location"`
	Latitude         float64                `json:"latitude"`
	Longitude        float64                `json:"longitude"`
	RiskScore        int                    `json:"risk_score"`
	StatusLevel      string                 `json:"status_level"`
	MetricsSnapshot  map[string]interface{} `json:"metrics_snapshot"`
	GeminiSummary    string                 `json:"gemini_summary"`
	ActionableItems  []string               `json:"actionable_items"`
	Timestamp        time.Time              `json:"timestamp"`
}

type ChatMessage struct {
	ID        string    `json:"id"`
	SessionID string    `json:"session_id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

type FirebaseStore struct {
	mu           sync.RWMutex
	projectID    string
	watchlists   map[string]WatchlistLocation
	reports      []RiskReport
	chatHistory  []ChatMessage
}

var fbStore *FirebaseStore

func initFirebase() {
	proj := os.Getenv("FIREBASE_PROJECT_ID")
	if proj == "" {
		proj = "jonam-mvp"
	}
	fbStore = &FirebaseStore{
		projectID:   proj,
		watchlists:  make(map[string]WatchlistLocation),
		reports:     make([]RiskReport, 0),
		chatHistory: make([]ChatMessage, 0),
	}

	// Seed default watchlists for Lake Victoria hotspots
	fbStore.watchlists["Kisumu"] = WatchlistLocation{
		ID:        "loc-1",
		Name:      "Kisumu Bay, Kenya",
		Latitude:  -0.1022,
		Longitude: 34.7617,
		CreatedAt: time.Now(),
	}
	fbStore.watchlists["HomaBay"] = WatchlistLocation{
		ID:        "loc-2",
		Name:      "Homa Bay, Kenya",
		Latitude:  -0.5273,
		Longitude: 34.4571,
		CreatedAt: time.Now(),
	}
	fbStore.watchlists["Jinja"] = WatchlistLocation{
		ID:        "loc-3",
		Name:      "Jinja / Nile Outlet, Uganda",
		Latitude:  0.4244,
		Longitude: 33.2042,
		CreatedAt: time.Now(),
	}

	log.Printf("Firebase Firestore store initialized (Project ID: %s)", proj)
}

func (s *FirebaseStore) AddWatchlist(loc WatchlistLocation) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.watchlists[loc.Name] = loc
	s.syncToFirebase("watchlists", loc.ID, loc)
}

func (s *FirebaseStore) GetWatchlists() []WatchlistLocation {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]WatchlistLocation, 0, len(s.watchlists))
	for _, v := range s.watchlists {
		list = append(list, v)
	}
	return list
}

func (s *FirebaseStore) SaveReport(report RiskReport) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reports = append(s.reports, report)
	s.syncToFirebase("risk_reports", report.ID, report)
}

func (s *FirebaseStore) GetReports() []RiskReport {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.reports
}

func (s *FirebaseStore) AddChatMessage(msg ChatMessage) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.chatHistory = append(s.chatHistory, msg)
	s.syncToFirebase("chat_history", msg.ID, msg)
}

func (s *FirebaseStore) GetChatHistory() []ChatMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.chatHistory
}

func (s *FirebaseStore) syncToFirebase(collection string, docID string, data interface{}) {
	// Attempt asynchronous sync to Firestore REST endpoint
	go func() {
		url := fmt.Sprintf("https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/%s", s.projectID, collection)
		jb, err := json.Marshal(data)
		if err != nil {
			return
		}
		req, err := http.NewRequest("POST", url, bytes.NewReader(jb))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err == nil && resp != nil {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
		}
	}()
}
