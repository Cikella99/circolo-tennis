const cancelCard = document.getElementById("cancelCard");
const bookingId = new URLSearchParams(window.location.search).get("id");

function formatFullDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function renderNotFound(message) {
  cancelCard.innerHTML = `<p class="slot-hint">${message}</p>`;
}

function renderBooking(booking) {
  const sportInfo = SPORTS[booking.sport];
  const durationLabel = booking.duration === 1 ? "1 ora" : `${String(booking.duration).replace(".", ",")} ore`;

  cancelCard.innerHTML = `
    <h3 class="admin-card-title">Dettagli prenotazione</h3>
    <div class="summary-row"><span>Sport</span><span>${sportInfo.emoji} ${sportInfo.label}</span></div>
    <div class="summary-row"><span>Campo</span><span>${booking.court}</span></div>
    <div class="summary-row"><span>Data</span><span>${formatFullDate(booking.date)}</span></div>
    <div class="summary-row"><span>Orario</span><span>${booking.time}</span></div>
    <div class="summary-row"><span>Durata</span><span>${durationLabel}</span></div>
    ${booking.clientName ? `<div class="summary-row"><span>Nome</span><span>${booking.clientName}</span></div>` : ""}
    <button class="btn btn-primary btn-block" id="cancelBtn" style="margin-top: 20px; background: #c94f34;">Disdici questa prenotazione</button>
  `;

  document.getElementById("cancelBtn").addEventListener("click", () => {
    deleteBooking(booking.id);
    cancelCard.innerHTML = `
      <div class="confirmation-box show">✓ Prenotazione disdetta. L'orario è stato liberato ed è di nuovo prenotabile.</div>
      <a href="booking.html" class="btn btn-outline btn-block" style="margin-top: 16px;">Torna al booking</a>
    `;
  });
}

if (!bookingId) {
  renderNotFound("Link non valido: manca il riferimento alla prenotazione.");
} else {
  const booking = getBookings().find((b) => b.id === bookingId);
  if (!booking) {
    renderNotFound("Prenotazione non trovata: potrebbe essere già stata disdetta, oppure il link è stato aperto in un browser diverso da quello usato per prenotare (in questa demo i dati sono salvati solo localmente).");
  } else {
    renderBooking(booking);
  }
}
