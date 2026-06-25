"use client";

import { useState, useEffect, useRef } from "react";

// Month names in Spanish
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function Home() {
  const [allBirthdays, setAllBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation state (1-indexed: 1 = Enero, 12 = Diciembre)
  // Get date helper (supports mocking via ?mockDate=YYYY-MM-DD or ?date=YYYY-MM-DD)
  const getTodayDate = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mock = params.get("mockDate") || params.get("date");
      if (mock) {
        const parsed = new Date(mock + "T00:00:00");
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return new Date();
  };

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  
  // Clock state
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  
  // For detecting date changes (day rollover)
  const currentDayRef = useRef(1);
  
  // Celebration overlay visibility
  const [showCelebration, setShowCelebration] = useState(true);

  // Fetch birthdays from the local API
  const fetchBirthdays = async () => {
    try {
      const res = await fetch("/api/birthdays");
      if (!res.ok) throw new Error("No se pudieron cargar los datos");
      const data = await res.json();
      setAllBirthdays(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error al conectar con la base de datos de cumpleaños.");
    } finally {
      setLoading(false);
    }
  };

  // Clock tick and day rollover checking
  useEffect(() => {
    // Set initial values on client mount
    currentDayRef.current = getTodayDate().getDate();
    setSelectedMonth(getTodayDate().getMonth() + 1);

    const updateTime = () => {
      const now = new Date();
      const todayDate = getTodayDate();
      
      // Check if day has changed (rollover at midnight) - bypass if date is mocked
      const params = new URLSearchParams(window.location.search);
      const isMocked = params.get("mockDate") || params.get("date");
      
      if (!isMocked && now.getDate() !== currentDayRef.current) {
        console.log("Date changed! Reloading page...");
        window.location.reload();
        return;
      }

      // Format time: HH:MM:SS
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTimeStr(`${hours}:${minutes}:${seconds}`);

      // Format date in Spanish: "Jueves, 25 de Junio de 2026"
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const formattedDate = todayDate.toLocaleDateString('es-AR', options);
      
      // Capitalize first letter
      setDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial fetch and hourly auto-refresh
  useEffect(() => {
    fetchBirthdays();
    
    // Refresh data in background every 1 hour (3600000 ms)
    const backgroundFetchInterval = setInterval(fetchBirthdays, 3600000);
    
    return () => clearInterval(backgroundFetchInterval);
  }, []);

  // Handle month navigation
  const prevMonth = () => {
    setSelectedMonth((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const nextMonth = () => {
    setSelectedMonth((prev) => (prev === 12 ? 1 : prev + 1));
  };

  // Helpers for calculations
  const calculateDaysRemaining = (dia, mes) => {
    const today = getTodayDate();
    const currentYear = today.getFullYear();
    
    // Strip time from today's date for exact day comparisons
    const todayDate = new Date(currentYear, today.getMonth(), today.getDate());
    
    // Birthday this year
    let bday = new Date(currentYear, mes - 1, dia);
    
    // If birthday is in the past this year, target next year
    if (bday < todayDate) {
      bday = new Date(currentYear + 1, mes - 1, dia);
    }
    
    const diffTime = bday - todayDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Filter and sort birthdays for the selected month
  const getBirthdaysForSelectedMonth = () => {
    return allBirthdays
      .filter((person) => person.mes === selectedMonth)
      .map((person) => {
        const daysRemaining = calculateDaysRemaining(person.dia, person.mes);
        const isToday = daysRemaining === 0;
        return {
          ...person,
          daysRemaining,
          isToday,
        };
      })
      .sort((a, b) => a.dia - b.dia); // Order ascending by day
  };

  // Get people who have birthday TODAY
  const getTodayBirthdays = () => {
    return allBirthdays
      .map((person) => {
        const daysRemaining = calculateDaysRemaining(person.dia, person.mes);
        return {
          ...person,
          isToday: daysRemaining === 0,
        };
      })
      .filter((person) => person.isToday);
  };

  const filteredBirthdays = getBirthdaysForSelectedMonth();
  const todayBirthdays = getTodayBirthdays();
  const hasBirthdaysToday = todayBirthdays.length > 0;

  // Generate lightweight confetti particles
  const renderConfetti = () => {
    const particles = [];
    const colors = ["#6366f1", "#a855f7", "#06b6d4", "#fbbf24", "#ec4899", "#10b981"];
    
    for (let i = 0; i < 50; i++) {
      const style = {
        left: `${Math.random() * 100}%`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        width: `${Math.random() * 8 + 6}px`,
        height: `${Math.random() * 8 + 6}px`,
        animationDelay: `${Math.random() * 6}s`,
        animationDuration: `${Math.random() * 4 + 4}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      };
      particles.push(<div key={i} className="confetti-particle" style={style} />);
    }
    return particles;
  };

  return (
    <main className="app-container">
      {/* Celebration overlay if it's someone's birthday today */}
      {hasBirthdaysToday && showCelebration && (
        <div className="celebration-overlay">
          <div className="confetti-container">{renderConfetti()}</div>
          
          <button 
            className="celebration-close-btn"
            onClick={() => setShowCelebration(false)}
            title="Cerrar saludo"
          >
            ✕
          </button>

          <div className="glass-panel celebration-card">
            <div className="celebration-icon">🎉 🎂 🎁</div>
            <div className="celebration-title">¡Hoy es el cumpleaños de!</div>
            
            <div className="celebration-names-container">
              {todayBirthdays.map((person, idx) => (
                <div key={idx} className="celebration-name-item">
                  {person.nombre}
                  {person.curso && (
                    <div>
                      <span className="celebration-course-badge">{person.curso}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="celebration-message">
              Toda la comunidad de <strong>IPETyM</strong> te desea un día maravilloso lleno de alegrías, sonrisas y momentos especiales. ¡Muchas felicidades!
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <header className="header">
        <div className="header-title-section">
          <img src="/logo.jpg" alt="Logo IPETyM" className="header-logo" />
          <h1>
            <span className="header-title-main">IPETyM 256</span>
            <span className="header-title-cursive">Cumpleaños</span>
          </h1>
        </div>
        <div className="live-clock">
          <div className="live-clock-time">{timeStr || "00:00:00"}</div>
          <div className="live-clock-date">{dateStr || "Cargando fecha..."}</div>
        </div>
      </header>

      {/* Month Navigation */}
      <section className="navigation-bar">
        <button className="nav-button" onClick={prevMonth}>
          ◀ Anterior
        </button>
        <div className="current-month-display">
          {MONTHS[selectedMonth - 1]}
        </div>
        <button className="nav-button" onClick={nextMonth}>
          Siguiente ▶
        </button>
      </section>

      {/* Main Birthday Display Grid */}
      {loading ? (
        <div className="glass-panel" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", fontSize: "18px" }}>
          Cargando datos de cumpleaños...
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "16px", padding: "40px", textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: "18px", fontWeight: "600" }}>{error}</p>
          <button className="nav-button" onClick={() => { setLoading(true); fetchBirthdays(); }}>
            Reintentar
          </button>
        </div>
      ) : (
        <section className="birthdays-grid">
          {filteredBirthdays.length > 0 ? (
            filteredBirthdays.map((person, index) => {
              const nearBirthday = person.daysRemaining <= 7 && person.daysRemaining > 0;
              const cardClass = person.isToday
                ? "birthday-card glass-panel card-today"
                : nearBirthday
                ? "birthday-card glass-panel card-near"
                : "birthday-card glass-panel";

              return (
                <div key={index} className={cardClass}>
                  <div className="birthday-card-info">
                    <div className="birthday-card-name" title={person.nombre}>
                      {person.nombre}
                    </div>
                    <div className="birthday-card-meta">
                      <span className="birthday-card-date">
                        {person.dia} de {MONTHS[person.mes - 1]}
                      </span>
                      {person.curso && (
                        <span className="birthday-card-course" title={person.curso}>
                          {person.curso}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="birthday-card-countdown">
                    {person.isToday ? (
                      <>
                        <span className="countdown-number">🎉 Hoy</span>
                        <span className="countdown-label">¡Felicidades!</span>
                      </>
                    ) : (
                      <>
                        <span className="countdown-number">{person.daysRemaining}</span>
                        <span className="countdown-label">
                          {person.daysRemaining === 1 ? "día" : "días"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state glass-panel">
              <span className="empty-state-icon">📅</span>
              <p>No hay cumpleaños registrados en el mes de {MONTHS[selectedMonth - 1]}.</p>
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        <div className="footer-info">
          <span>IPETyM Birthday Board v1.0</span>
          <span>•</span>
          <span>Resolución: 1200 x 800 (Modo Kiosco)</span>
          {hasBirthdaysToday && (
            <>
              <span>•</span>
              <button 
                onClick={() => setShowCelebration(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-gold)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                  textDecoration: "underline",
                }}
              >
                Ver saludo de hoy
              </button>
            </>
          )}
        </div>

        <div className="footer-qr-container">
          <span>Cargá tu cumpleaños aquí:</span>
          <a 
            href="https://docs.google.com/spreadsheets/d/1CpDQahoKzKByyWqYgagJvxCMT43O32B6R6MIlAg5he4/edit" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Cargar cumpleaños en planilla"
          >
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1CpDQahoKzKByyWqYgagJvxCMT43O32B6R6MIlAg5he4%2Fedit&color=080916&bgcolor=ffffff" 
              alt="Código QR Planilla" 
              className="footer-qr-image"
            />
          </a>
        </div>

        <div className="footer-status-indicator">
          <span className="status-dot"></span>
          <span>Datos sincronizados</span>
        </div>
      </footer>
    </main>
  );
}
