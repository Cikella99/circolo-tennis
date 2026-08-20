const adminState = {
  sport: null,
  court: null,
  date: null,
  time: null,
  duration: 1,
};

const adminSportOptions = document.querySelectorAll("#adminSportOptions .sport-option");
const adminCourtOptionsEl = document.getElementById("adminCourtOptions");
const adminDate = document.getElementById("adminDate");
const adminDuration = document.getElementById("adminDuration");
const adminSlotGrid = document.getElementById("adminSlotGrid");
const adminConfirmBtn = document.getElementById("adminConfirmBtn");
const adminConfirmationBox = document.getElementById("adminConfirmationBox");
const clientNameInput = document.getElementById("clientName");
const clientPhoneInput = document.getElementById("clientPhone");

const today = getTodayLocal();
adminDate.min = today;
adminState.date = today;
adminDate.value = today;

function populateAdminCourts(sportKey) {
  const sport = SPORTS[sportKey];
  adminCourtOptionsEl.innerHTML = "";
  sport.courts.forEach((court) => {
    const div = document.createElement("div");
    div.className = "court-option";
    div.dataset.court = court;
    div.textContent = court;
    div.addEventListener("click", () => selectAdminCourt(court, div));
    adminCourtOptionsEl.appendChild(div);
  });
}

function renderAdminSlotGrid() {
  if (!adminState.sport || !adminState.court || !adminState.date) {
    adminSlotGrid.innerHTML = '<p class="slot-hint">Seleziona sport, campo e data</p>';
    return;
  }
  const slots = buildTimeSlots(adminState.date);
  if (slots.length === 0) {
    adminSlotGrid.innerHTML = '<p class="slot-hint">Il circolo è chiuso in questa data</p>';
    return;
  }
  adminSlotGrid.innerHTML = "";
  slots.forEach((slot) => {
    const occupied = isSlotOccupied(adminState.sport, adminState.court, adminState.date, slot);
    const btn = document.createElement("div");
    btn.className = "slot-btn" + (occupied ? " busy" : "") + (adminState.time === slot ? " selected" : "");
    btn.textContent = slot;
    if (!occupied) {
      btn.addEventListener("click", () => selectAdminTime(slot, btn));
    }
    adminSlotGrid.appendChild(btn);
  });
}

function selectAdminTime(slot, el) {
  document.querySelectorAll("#adminSlotGrid .slot-btn").forEach((b) => b.classList.remove("selected"));
  el.classList.add("selected");
  adminState.time = slot;
  updateAdminButton();
}

function selectAdminSport(sportKey, el) {
  adminSportOptions.forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  adminState.sport = sportKey;
  adminState.court = null;
  adminState.time = null;
  populateAdminCourts(sportKey);
  renderAdminSlotGrid();
  updateAdminButton();
}

function selectAdminCourt(court, el) {
  document.querySelectorAll("#adminCourtOptions .court-option").forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  adminState.court = court;
  adminState.time = null;
  renderAdminSlotGrid();
  updateAdminButton();
}

function updateAdminButton() {
  const ready = adminState.sport && adminState.court && adminState.date && adminState.time && adminState.duration;
  adminConfirmBtn.disabled = !ready;
  adminConfirmationBox.classList.remove("show");
}

adminSportOptions.forEach((el) => {
  el.addEventListener("click", () => selectAdminSport(el.dataset.sport, el));
});

adminDate.addEventListener("change", () => {
  adminState.date = adminDate.value;
  adminState.time = null;
  renderAdminSlotGrid();
  updateAdminButton();
});

adminDuration.addEventListener("change", () => {
  adminState.duration = parseFloat(adminDuration.value);
  updateAdminButton();
});

adminConfirmBtn.addEventListener("click", () => {
  const conflict = findConflict(adminState.sport, adminState.court, adminState.date, adminState.time, adminState.duration);
  if (conflict) {
    adminConfirmationBox.textContent = "⚠ Questo slot risulta già occupato, scegli un altro orario.";
    adminConfirmationBox.classList.add("show", "error");
    renderAdminSlotGrid();
    return;
  }

  addBooking({
    sport: adminState.sport,
    court: adminState.court,
    date: adminState.date,
    time: adminState.time,
    duration: adminState.duration,
    source: "desk",
    clientName: clientNameInput.value.trim(),
    clientPhone: clientPhoneInput.value.trim(),
  });

  adminConfirmationBox.textContent = "✓ Orario bloccato con successo.";
  adminConfirmationBox.classList.remove("error");
  adminConfirmationBox.classList.add("show");

  adminState.time = null;
  clientNameInput.value = "";
  clientPhoneInput.value = "";
  renderAdminSlotGrid();
  updateAdminButton();
  renderNav();
  renderScheduleTable();
  renderClientsTable();
});

/* --- Orari di apertura --- */
const hoursEditor = document.getElementById("hoursEditor");
const saveHoursBtn = document.getElementById("saveHoursBtn");
const hoursConfirmationBox = document.getElementById("hoursConfirmationBox");

function renderHoursEditor() {
  const hours = getHours();
  hoursEditor.innerHTML = "";
  ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach((key) => {
    const row = document.createElement("div");
    row.className = "hours-editor-row";
    row.innerHTML = `
      <span class="hours-editor-label">${WEEKDAY_LABELS[key]}</span>
      <input type="time" data-day="${key}" data-field="open" value="${hours[key].open}" />
      <span class="hours-editor-sep">–</span>
      <input type="time" data-day="${key}" data-field="close" value="${hours[key].close}" />
    `;
    hoursEditor.appendChild(row);
  });
}

saveHoursBtn.addEventListener("click", () => {
  const hours = getHours();
  hoursEditor.querySelectorAll("input[type=time]").forEach((input) => {
    const day = input.dataset.day;
    const field = input.dataset.field;
    hours[day][field] = input.value;
  });
  saveHours(hours);
  hoursConfirmationBox.classList.add("show");
  renderAdminSlotGrid();
  renderScheduleTable();
  setTimeout(() => hoursConfirmationBox.classList.remove("show"), 2500);
});

/* --- Orari per giorno specifico --- */
const adhocDate = document.getElementById("adhocDate");
const adhocClosed = document.getElementById("adhocClosed");
const adhocTimesRow = document.getElementById("adhocTimesRow");
const adhocOpen = document.getElementById("adhocOpen");
const adhocClose = document.getElementById("adhocClose");
const saveAdhocBtn = document.getElementById("saveAdhocBtn");
const adhocConfirmationBox = document.getElementById("adhocConfirmationBox");
const adhocList = document.getElementById("adhocList");

adhocDate.value = today;

function loadAdhocFormFor(dateStr) {
  const overrides = getHoursOverrides();
  const existing = overrides[dateStr];
  const weekdayHours = getHours()[weekdayKeyFromDate(dateStr)];

  if (existing) {
    adhocClosed.checked = !!existing.closed;
    adhocOpen.value = existing.closed ? weekdayHours.open : existing.open;
    adhocClose.value = existing.closed ? weekdayHours.close : existing.close;
  } else {
    adhocClosed.checked = false;
    adhocOpen.value = weekdayHours.open;
    adhocClose.value = weekdayHours.close;
  }
  adhocTimesRow.style.display = adhocClosed.checked ? "none" : "grid";
}

adhocDate.addEventListener("change", () => loadAdhocFormFor(adhocDate.value));

adhocClosed.addEventListener("change", () => {
  adhocTimesRow.style.display = adhocClosed.checked ? "none" : "grid";
});

function formatAdhocDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function renderAdhocList() {
  const overrides = getHoursOverrides();
  const dates = Object.keys(overrides).sort();
  adhocList.innerHTML = "";

  if (dates.length === 0) {
    adhocList.innerHTML = '<p class="slot-hint">Nessuna eccezione impostata al momento.</p>';
    return;
  }

  dates.forEach((dateStr) => {
    const override = overrides[dateStr];
    const desc = override.closed ? "Chiuso tutto il giorno" : `Orario: ${override.open} – ${override.close}`;
    const row = document.createElement("div");
    row.className = "adhoc-item";
    row.innerHTML = `
      <div>
        <strong>${formatAdhocDate(dateStr)}</strong>
        <span>${desc}</span>
      </div>
      <button class="btn-cancel" data-date="${dateStr}">Rimuovi</button>
    `;
    adhocList.appendChild(row);
  });

  adhocList.querySelectorAll(".btn-cancel").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeHoursOverride(btn.dataset.date);
      renderAdhocList();
      renderAdminSlotGrid();
    });
  });
}

saveAdhocBtn.addEventListener("click", () => {
  const dateStr = adhocDate.value;
  if (!dateStr) return;

  const value = adhocClosed.checked
    ? { closed: true }
    : { open: adhocOpen.value, close: adhocClose.value };

  setHoursOverride(dateStr, value);
  adhocConfirmationBox.classList.add("show");
  setTimeout(() => adhocConfirmationBox.classList.remove("show"), 2500);
  renderAdhocList();
  renderAdminSlotGrid();
  renderScheduleTable();
});

loadAdhocFormFor(adhocDate.value);

function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* --- Navigazione a blocchi --- */
const adminNav = document.getElementById("adminNav");
const workspacePlaceholder = document.getElementById("workspacePlaceholder");
let activeView = null;

const NAV_ITEMS = [
  { key: "schedule", icon: "🗓️", label: "Prenotazioni attive", badge: () => getBookings().length },
  { key: "add", icon: "➕", label: "Aggiungi prenotazione", badge: null },
  { key: "clients", icon: "🧾", label: "Storico clienti", badge: () => getClientStats().length },
  { key: "hours", icon: "🕒", label: "Orari di apertura", badge: null },
];

function renderNav() {
  adminNav.innerHTML = NAV_ITEMS.map((item) => `
    <div class="nav-card${activeView === item.key ? " active" : ""}" data-view="${item.key}">
      <div class="nav-card-icon">${item.icon}</div>
      <div class="nav-card-label">${item.label}</div>
      ${item.badge ? `<div class="nav-card-badge">${item.badge()}</div>` : ""}
    </div>
  `).join("");

  adminNav.querySelectorAll(".nav-card").forEach((card) => {
    card.addEventListener("click", () => selectView(card.dataset.view));
  });
}

function selectView(viewKey) {
  activeView = activeView === viewKey ? null : viewKey;

  document.querySelectorAll(".workspace-view").forEach((v) => { v.style.display = "none"; });
  workspacePlaceholder.style.display = activeView ? "none" : "block";
  if (activeView) {
    document.getElementById(`view-${activeView}`).style.display = "block";
  }
  renderNav();
}

/* --- Disponibilità giornaliera --- */
const scheduleDate = document.getElementById("scheduleDate");
const scheduleTable = document.getElementById("scheduleTable");
const scheduleDetail = document.getElementById("scheduleDetail");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");

scheduleDate.value = today;

function shiftScheduleDate(deltaDays) {
  const current = new Date(scheduleDate.value + "T00:00:00");
  current.setDate(current.getDate() + deltaDays);
  scheduleDate.value = dateToLocalISO(current);
  scheduleDetail.textContent = "Clicca su uno slot occupato per vedere i dettagli della prenotazione.";
  renderScheduleTable();
}

prevDayBtn.addEventListener("click", () => shiftScheduleDate(-1));
nextDayBtn.addEventListener("click", () => shiftScheduleDate(1));

function renderScheduleTable() {
  const dateStr = scheduleDate.value;
  const slots = buildTimeSlots(dateStr);
  const courts = getAllCourts();

  if (slots.length === 0) {
    scheduleTable.innerHTML = "";
    scheduleDetail.textContent = "Il circolo è chiuso in questa data.";
    return;
  }

  let head = "<thead><tr><th>Campo</th>";
  slots.forEach((slot) => { head += `<th>${slot}</th>`; });
  head += "</tr></thead>";

  let body = "<tbody>";
  courts.forEach(({ sport, court }) => {
    const sportInfo = SPORTS[sport];
    body += `<tr><td class="schedule-court">${sportInfo.emoji} ${sportInfo.label} – ${court}</td>`;
    slots.forEach((slot) => {
      const booking = findBookingAtSlot(sport, court, dateStr, slot);
      if (booking) {
        body += `<td class="schedule-cell busy" data-id="${booking.id}"></td>`;
      } else {
        body += `<td class="schedule-cell free"></td>`;
      }
    });
    body += "</tr>";
  });
  body += "</tbody>";

  scheduleTable.innerHTML = head + body;

  scheduleTable.querySelectorAll(".schedule-cell.busy").forEach((cell) => {
    cell.addEventListener("click", () => {
      scheduleTable.querySelectorAll(".schedule-cell.selected").forEach((c) => c.classList.remove("selected"));
      cell.classList.add("selected");
      showScheduleDetail(cell.dataset.id);
    });
  });
}

function showScheduleDetail(bookingId) {
  const booking = getBookings().find((b) => b.id === bookingId);
  if (!booking) {
    scheduleDetail.textContent = "Prenotazione non trovata (potrebbe essere stata appena annullata).";
    return;
  }
  const sportInfo = SPORTS[booking.sport];
  const durationLabel = booking.duration === 1 ? "1 ora" : `${String(booking.duration).replace(".", ",")} ore`;
  const sourceLabel = booking.source === "online" ? "💻 Online" : "🛎️ Desk";
  const clientLabel = [booking.clientName, booking.clientPhone].filter(Boolean).join(" · ") || "Nessun contatto registrato";

  scheduleDetail.innerHTML = `
    <div class="schedule-detail-row">
      <div>
        <strong>${sportInfo.emoji} ${sportInfo.label} – ${booking.court}</strong>
        · ${booking.time} (${durationLabel}) · ${sourceLabel}<br>
        👤 ${clientLabel}
      </div>
      <button class="btn-cancel" id="scheduleCancelBtn">Cancella prenotazione</button>
    </div>
  `;

  document.getElementById("scheduleCancelBtn").addEventListener("click", () => {
    deleteBooking(bookingId);
    scheduleDetail.textContent = "✓ Prenotazione cancellata. Lo slot è di nuovo libero.";
    renderScheduleTable();
    renderNav();
  });
}

scheduleDate.addEventListener("change", () => {
  scheduleDetail.textContent = "Clicca su uno slot occupato per vedere i dettagli della prenotazione.";
  renderScheduleTable();
});

/* --- Storico clienti --- */
const clientsTableBody = document.getElementById("clientsTableBody");
const noClientsMsg = document.getElementById("noClientsMsg");

function renderClientsTable() {
  const clients = getClientStats();
  clientsTableBody.innerHTML = "";

  if (clients.length === 0) {
    noClientsMsg.style.display = "block";
    return;
  }
  noClientsMsg.style.display = "none";

  clients.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.count}</td>
      <td>${formatDateShort(c.lastDate)}</td>
    `;
    clientsTableBody.appendChild(tr);
  });
}

renderHoursEditor();
renderAdhocList();
renderNav();
renderScheduleTable();
renderClientsTable();
