/* Livello dati condiviso tra booking.html e gestionale.html.
   Simulato con localStorage: persiste solo su questo browser, non è un vero backend. */

const SPORTS = {
  tennis: { label: "Tennis", emoji: "🎾", pricePerHour: 18, courts: ["Campo 1", "Campo 2", "Campo 3", "Campo 4"] },
  padel: { label: "Padel", emoji: "🏓", pricePerHour: 24, courts: ["Campo 1", "Campo 2"] },
  calcetto: { label: "Calcetto", emoji: "⚽", pricePerHour: 40, courts: ["Campo 1", "Campo 2"] },
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABELS = {
  mon: "Lunedì", tue: "Martedì", wed: "Mercoledì", thu: "Giovedì",
  fri: "Venerdì", sat: "Sabato", sun: "Domenica",
};

const DEFAULT_HOURS = {
  mon: { open: "08:00", close: "23:00" },
  tue: { open: "08:00", close: "23:00" },
  wed: { open: "08:00", close: "23:00" },
  thu: { open: "08:00", close: "23:00" },
  fri: { open: "08:00", close: "23:00" },
  sat: { open: "08:00", close: "22:00" },
  sun: { open: "09:00", close: "20:00" },
};

const HOURS_KEY = "nuvolette_hours";
const HOURS_OVERRIDES_KEY = "nuvolette_hours_overrides";
const BOOKINGS_KEY = "nuvolette_bookings";
const HISTORY_KEY = "nuvolette_history";

/* Formatta una Date in YYYY-MM-DD usando i componenti locali (non UTC).
   toISOString() converte in UTC e può far "retrocedere" di un giorno nei fusi
   orari avanti rispetto a UTC (es. l'Italia) quando l'orario locale è vicino
   alla mezzanotte: va sempre evitato per manipolare date di calendario. */
function dateToLocalISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayLocal() {
  return dateToLocalISO(new Date());
}

function getAllCourts() {
  const list = [];
  Object.keys(SPORTS).forEach((sportKey) => {
    SPORTS[sportKey].courts.forEach((court) => {
      list.push({ sport: sportKey, court });
    });
  });
  return list;
}

function seedDemoBookings() {
  const today = new Date();
  const inDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return dateToLocalISO(d);
  };
  const now = new Date().toISOString();
  return [
    { id: "seed-1", sport: "tennis", court: "Campo 1", date: inDays(0), time: "09:00", duration: 1, source: "online", clientName: "Elena Ferri", clientPhone: "347 1122334", createdAt: now },
    { id: "seed-2", sport: "padel", court: "Campo 2", date: inDays(0), time: "17:00", duration: 1.5, source: "desk", clientName: "Luca Bianchi", clientPhone: "339 5566778", createdAt: now },
    { id: "seed-3", sport: "tennis", court: "Campo 2", date: inDays(1), time: "18:00", duration: 1.5, source: "desk", clientName: "Marco Rossi", clientPhone: "333 1234567", createdAt: now },
    { id: "seed-4", sport: "padel", court: "Campo 1", date: inDays(1), time: "19:00", duration: 1, source: "online", clientName: "Sara Conti", clientPhone: "328 4455667", createdAt: now },
    { id: "seed-5", sport: "calcetto", court: "Campo 1", date: inDays(2), time: "21:00", duration: 1, source: "desk", clientName: "Circolo Amici", clientPhone: "06 1234567", createdAt: now },
    { id: "seed-6", sport: "tennis", court: "Campo 3", date: inDays(2), time: "10:00", duration: 1, source: "online", clientName: "Giulia Neri", clientPhone: "347 9988776", createdAt: now },
    { id: "seed-7", sport: "padel", court: "Campo 2", date: inDays(3), time: "20:00", duration: 1, source: "desk", clientName: "Andrea Villa", clientPhone: "320 1122334", createdAt: now },
    { id: "seed-8", sport: "calcetto", court: "Campo 2", date: inDays(3), time: "19:00", duration: 2, source: "online", clientName: "Team Sportivo", clientPhone: "339 7766554", createdAt: now },
    { id: "seed-9", sport: "tennis", court: "Campo 4", date: inDays(4), time: "08:30", duration: 1, source: "desk", clientName: "Paolo Serra", clientPhone: "333 2233445", createdAt: now },
    { id: "seed-10", sport: "tennis", court: "Campo 1", date: inDays(5), time: "16:00", duration: 1.5, source: "online", clientName: "Elena Ferri", clientPhone: "347 1122334", createdAt: now },
    { id: "seed-11", sport: "padel", court: "Campo 1", date: inDays(5), time: "11:00", duration: 1, source: "desk", clientName: "Chiara Longo", clientPhone: "348 5566112", createdAt: now },
    { id: "seed-12", sport: "calcetto", court: "Campo 1", date: inDays(6), time: "18:00", duration: 1, source: "online", clientName: "Marco Rossi", clientPhone: "333 1234567", createdAt: now },
  ];
}

function getHours() {
  const raw = localStorage.getItem(HOURS_KEY);
  if (!raw) return { ...DEFAULT_HOURS };
  try {
    return { ...DEFAULT_HOURS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_HOURS };
  }
}

function saveHours(hours) {
  localStorage.setItem(HOURS_KEY, JSON.stringify(hours));
}

/* Eccezioni orario per una data specifica (es. Ferragosto, evento).
   { "2026-08-15": { closed: true } }  oppure  { "2026-12-24": { open: "08:00", close: "14:00" } } */
function getHoursOverrides() {
  const raw = localStorage.getItem(HOURS_OVERRIDES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveHoursOverrides(overrides) {
  localStorage.setItem(HOURS_OVERRIDES_KEY, JSON.stringify(overrides));
}

function setHoursOverride(dateStr, value) {
  const overrides = getHoursOverrides();
  overrides[dateStr] = value;
  saveHoursOverrides(overrides);
}

function removeHoursOverride(dateStr) {
  const overrides = getHoursOverrides();
  delete overrides[dateStr];
  saveHoursOverrides(overrides);
}

function getHoursForDate(dateStr) {
  const overrides = getHoursOverrides();
  const override = overrides[dateStr];
  if (override) {
    return override.closed ? null : { open: override.open, close: override.close };
  }
  const key = weekdayKeyFromDate(dateStr);
  return getHours()[key] || null;
}

function getBookings() {
  const raw = localStorage.getItem(BOOKINGS_KEY);
  if (!raw) {
    const seeded = seedDemoBookings();
    saveBookings(seeded);
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBookings(list) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
}

function addBooking(booking) {
  const list = getBookings();
  const entry = {
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    ...booking,
  };
  list.push(entry);
  saveBookings(list);
  addToHistory(entry);
  return entry;
}

function deleteBooking(id) {
  const list = getBookings().filter((b) => b.id !== id);
  saveBookings(list);
}

/* Registro permanente di tutte le prenotazioni mai fatte, usato per lo storico clienti.
   Non viene mai ripulito da deleteBooking: una prenotazione disdetta resta nello storico. */
function getHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) {
    const seeded = seedDemoBookings();
    saveHistory(seeded);
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function addToHistory(booking) {
  const history = getHistory();
  history.push(booking);
  saveHistory(history);
}

function getClientStats() {
  const map = new Map();
  getHistory().forEach((b) => {
    const phone = (b.clientPhone || "").trim();
    const name = (b.clientName || "").trim();
    if (!phone && !name) return;
    const key = phone || name;
    if (!map.has(key)) {
      map.set(key, { name: name || "—", phone: phone || "—", count: 0, lastDate: b.date });
    }
    const client = map.get(key);
    client.count += 1;
    if (name && client.name === "—") client.name = name;
    if (b.date > client.lastDate) client.lastDate = b.date;
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function weekdayKeyFromDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return WEEKDAY_KEYS[d.getDay()];
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function buildTimeSlots(dateStr) {
  if (!dateStr) return [];
  const hours = getHoursForDate(dateStr);
  if (!hours) return [];
  const startM = timeToMinutes(hours.open);
  const endM = timeToMinutes(hours.close);
  const slots = [];
  for (let m = startM; m < endM; m += 30) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

function findConflict(sport, court, date, time, duration, excludeId) {
  const reqStart = timeToMinutes(time);
  const reqEnd = reqStart + duration * 60;
  return getBookings().find((b) => {
    if (b.id === excludeId) return false;
    if (b.sport !== sport || b.court !== court || b.date !== date) return false;
    const bStart = timeToMinutes(b.time);
    const bEnd = bStart + b.duration * 60;
    return reqStart < bEnd && bStart < reqEnd;
  });
}

function findBookingAtSlot(sport, court, date, slotTime) {
  const slotM = timeToMinutes(slotTime);
  return getBookings().find((b) => {
    if (b.sport !== sport || b.court !== court || b.date !== date) return false;
    const bStart = timeToMinutes(b.time);
    const bEnd = bStart + b.duration * 60;
    return slotM >= bStart && slotM < bEnd;
  });
}

function isSlotOccupied(sport, court, date, slotTime) {
  return !!findBookingAtSlot(sport, court, date, slotTime);
}
