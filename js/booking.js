const state = {
  sport: null,
  court: null,
  date: null,
  time: null,
  duration: null,
};

const sportOptions = document.querySelectorAll(".sport-option");
const courtOptionsEl = document.getElementById("courtOptions");
const dateInput = document.getElementById("dateInput");
const durationOptions = document.querySelectorAll(".duration-option");
const slotGrid = document.getElementById("slotGrid");
const confirmBtn = document.getElementById("confirmBtn");
const confirmationBox = document.getElementById("confirmationBox");
const clientNameInput = document.getElementById("clientNameInput");
const clientPhoneInput = document.getElementById("clientPhoneInput");
const whatsappPreview = document.getElementById("whatsappPreview");
const whatsappBubble = document.getElementById("whatsappBubble");

const sumSport = document.getElementById("sumSport");
const sumCourt = document.getElementById("sumCourt");
const sumDate = document.getElementById("sumDate");
const sumTime = document.getElementById("sumTime");
const sumDuration = document.getElementById("sumDuration");
const sumTotal = document.getElementById("sumTotal");

const today = getTodayLocal();
dateInput.min = today;

function populateCourts(sportKey) {
  const sport = SPORTS[sportKey];
  courtOptionsEl.innerHTML = "";
  sport.courts.forEach((court) => {
    const div = document.createElement("div");
    div.className = "court-option";
    div.dataset.court = court;
    div.textContent = court;
    div.addEventListener("click", () => selectCourt(court, div));
    courtOptionsEl.appendChild(div);
  });
}

function renderSlotGrid() {
  if (!state.sport || !state.court || !state.date) {
    slotGrid.innerHTML = '<p class="slot-hint">Seleziona sport, campo e data per vedere gli orari disponibili</p>';
    return;
  }

  const slots = buildTimeSlots(state.date);

  if (slots.length === 0) {
    slotGrid.innerHTML = '<p class="slot-hint">Il circolo è chiuso in questa data</p>';
    return;
  }

  slotGrid.innerHTML = "";
  slots.forEach((slot) => {
    const occupied = isSlotOccupied(state.sport, state.court, state.date, slot);
    const btn = document.createElement("div");
    btn.className = "slot-btn" + (occupied ? " busy" : "") + (state.time === slot ? " selected" : "");
    btn.textContent = slot;
    if (!occupied) {
      btn.addEventListener("click", () => selectTime(slot, btn));
    }
    slotGrid.appendChild(btn);
  });
}

function selectTime(slot, el) {
  document.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("selected"));
  el.classList.add("selected");
  state.time = slot;
  updateSummary();
}

function selectSport(sportKey, el) {
  sportOptions.forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  state.sport = sportKey;
  state.court = null;
  state.time = null;
  populateCourts(sportKey);
  sumSport.textContent = SPORTS[sportKey].label;
  sumCourt.textContent = "—";
  renderSlotGrid();
  updateSummary();
}

function selectCourt(court, el) {
  document.querySelectorAll(".court-option").forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  state.court = court;
  state.time = null;
  sumCourt.textContent = court;
  renderSlotGrid();
  updateSummary();
}

function selectDuration(duration, el) {
  durationOptions.forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  state.duration = parseFloat(duration);
  sumDuration.textContent = duration === "1" ? "1 ora" : `${duration.replace(".", ",")} ore`;
  updateSummary();
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

function updateSummary() {
  state.date = dateInput.value;

  sumDate.textContent = formatDate(state.date);
  sumTime.textContent = state.time || "—";

  const ready = state.sport && state.court && state.date && state.time && state.duration
    && clientNameInput.value.trim() && clientPhoneInput.value.trim();

  if (state.sport && state.duration) {
    const total = SPORTS[state.sport].pricePerHour * state.duration;
    sumTotal.textContent = `€${total.toFixed(2).replace(/\.00$/, "")}`;
  } else {
    sumTotal.textContent = "€0";
  }

  confirmBtn.disabled = !ready;
  confirmationBox.classList.remove("show");
  confirmationBox.classList.remove("error");
}

sportOptions.forEach((el) => {
  el.addEventListener("click", () => selectSport(el.dataset.sport, el));
});

durationOptions.forEach((el) => {
  el.addEventListener("click", () => selectDuration(el.dataset.duration, el));
});

dateInput.addEventListener("change", () => {
  state.date = dateInput.value;
  state.time = null;
  renderSlotGrid();
  updateSummary();
});

clientNameInput.addEventListener("input", updateSummary);
clientPhoneInput.addEventListener("input", updateSummary);

function buildWhatsappMessage(booking) {
  const sportInfo = SPORTS[booking.sport];
  const durationLabel = booking.duration === 1 ? "1 ora" : `${String(booking.duration).replace(".", ",")} ore`;
  const cancelUrl = new URL(`cancella.html?id=${booking.id}`, window.location.href).href;

  return `✅ *Prenotazione confermata*
Circolo Tennis della Stampa di Roma

${sportInfo.emoji} ${sportInfo.label} – ${booking.court}
📅 ${formatDate(booking.date)}, ore ${booking.time} (${durationLabel})
💶 Totale: €${(sportInfo.pricePerHour * booking.duration).toFixed(2).replace(/\.00$/, "")}

Ciao ${booking.clientName}, ti aspettiamo!
Per disdire la prenotazione: ${cancelUrl}`;
}

confirmBtn.addEventListener("click", () => {
  const conflict = findConflict(state.sport, state.court, state.date, state.time, state.duration);
  if (conflict) {
    confirmationBox.textContent = "⚠ Questo orario è appena stato occupato da un'altra prenotazione. Scegli un altro slot.";
    confirmationBox.classList.add("show", "error");
    renderSlotGrid();
    return;
  }

  const booking = addBooking({
    sport: state.sport,
    court: state.court,
    date: state.date,
    time: state.time,
    duration: state.duration,
    source: "online",
    clientName: clientNameInput.value.trim(),
    clientPhone: clientPhoneInput.value.trim(),
  });

  const message = buildWhatsappMessage(booking);
  const cancelUrl = new URL(`cancella.html?id=${booking.id}`, window.location.href).href;
  whatsappBubble.innerHTML = message
    .split("\n")
    .map((line) => (line.includes(cancelUrl)
      ? `Per disdire la prenotazione: <a href="${cancelUrl}">${cancelUrl}</a>`
      : line.replace(/\*(.+?)\*/, "<strong>$1</strong>")))
    .join("<br>");
  whatsappPreview.classList.add("show");

  confirmationBox.classList.remove("show", "error");
  clientNameInput.disabled = true;
  clientPhoneInput.disabled = true;
  confirmBtn.textContent = "Prenotazione inviata ✓";
  confirmBtn.disabled = true;
});
