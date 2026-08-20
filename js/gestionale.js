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

const today = new Date().toISOString().split("T")[0];
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
  renderBookingsTable();
  renderStats();
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
});

loadAdhocFormFor(adhocDate.value);

/* --- Tabella prenotazioni --- */
const bookingsTableBody = document.getElementById("bookingsTableBody");
const noBookingsMsg = document.getElementById("noBookingsMsg");

function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatBookedAt(iso) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timePart = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

function renderBookingsTable() {
  const bookings = [...getBookings()].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  bookingsTableBody.innerHTML = "";

  if (bookings.length === 0) {
    noBookingsMsg.style.display = "block";
    return;
  }
  noBookingsMsg.style.display = "none";

  bookings.forEach((b) => {
    const tr = document.createElement("tr");
    const sportInfo = SPORTS[b.sport];
    const durationLabel = b.duration === 1 ? "1 ora" : `${String(b.duration).replace(".", ",")} ore`;
    const sourceLabel = b.source === "online" ? "💻 Online" : "🛎️ Desk";
    const clientLabel = [b.clientName, b.clientPhone].filter(Boolean).join(" · ") || "—";
    const bookedAtLabel = b.source === "online" ? formatBookedAt(b.createdAt) : "—";

    tr.innerHTML = `
      <td>${formatDateShort(b.date)}</td>
      <td>${b.time}</td>
      <td>${sportInfo.emoji} ${sportInfo.label}</td>
      <td>${b.court}</td>
      <td>${durationLabel}</td>
      <td>${sourceLabel}</td>
      <td>${bookedAtLabel}</td>
      <td>${clientLabel}</td>
      <td><button class="btn-cancel" data-id="${b.id}">Annulla</button></td>
    `;
    bookingsTableBody.appendChild(tr);
  });

  bookingsTableBody.querySelectorAll(".btn-cancel").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteBooking(btn.dataset.id);
      renderBookingsTable();
      renderAdminSlotGrid();
      renderStats();
    });
  });
}

/* --- Statistiche rapide --- */
const adminStats = document.getElementById("adminStats");

function renderStats() {
  const bookings = getBookings();
  const todayStr = new Date().toISOString().split("T")[0];

  const todayBookings = bookings.filter((b) => b.date === todayStr);
  const todayOnline = todayBookings.filter((b) => b.source === "online").length;
  const todayDesk = todayBookings.length - todayOnline;

  adminStats.innerHTML = `
    <div class="stat-tile">
      <strong>${bookings.length}</strong>
      <span>Prenotazioni attive</span>
    </div>
    <div class="stat-tile">
      <strong>${todayBookings.length}</strong>
      <span>Prenotate oggi</span>
      <span class="stat-sub">(${todayDesk} desk, ${todayOnline} online)</span>
    </div>
  `;
}

renderHoursEditor();
renderAdhocList();
renderBookingsTable();
renderStats();
