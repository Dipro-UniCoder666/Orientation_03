/**
 * app.js
 * ------
 * Screen flow:
 *   1. #screen-login   verify Student ID + Name against STUDENTS
 *   2. #screen-ticket  show the booked ticket stub
 *   3. #screen-reveal  glitch-text motion reveal of the event details
 */

(function () {
  "use strict";

  // ---- element refs --------------------------------------------------
  const screens = {
    login: document.getElementById("screen-login"),
    ticket: document.getElementById("screen-ticket"),
    reveal: document.getElementById("screen-reveal"),
  };

  const form = document.getElementById("login-form");
  const inputId = document.getElementById("input-id");
  const inputName = document.getElementById("input-name");
  const fieldId = document.getElementById("field-id");
  const fieldName = document.getElementById("field-name");
  const statusLine = document.getElementById("status-line");
  const btnVerify = document.getElementById("btn-verify");
  const btnEnter = document.getElementById("btn-enter");
  const btnBack = document.getElementById("btn-back");

  let currentStudent = null;

  // Pressing Enter in the ID field moves focus to Name instead of submitting.
  inputId.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputName.focus();
    }
  });

  // ---- helpers ---------------------------------------------------------
  function normalizeId(value) {
    return value.trim().toUpperCase();
  }

  function normalizeName(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function setStatus(message, kind) {
    statusLine.textContent = message;
    statusLine.className = "status-line" + (kind ? " " + kind : "");
  }

  function clearFieldErrors() {
    fieldId.classList.remove("error");
    fieldName.classList.remove("error");
  }

  // Looks up a student by ID, then checks the supplied name matches it.
  function verifyStudent(rawId, rawName) {
    const id = normalizeId(rawId);
    const name = normalizeName(rawName);

    if (!id || !name) {
      return { ok: false, reason: "empty" };
    }

    const record = STUDENTS.find((s) => normalizeId(s.id) === id);

    if (!record) {
      return { ok: false, reason: "no-id" };
    }

    if (normalizeName(record.name) !== name) {
      return { ok: false, reason: "name-mismatch" };
    }

    return { ok: true, student: record };
  }

  // ---- screen 1: verification form -------------------------------------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearFieldErrors();

    const result = verifyStudent(inputId.value, inputName.value);

    if (!result.ok) {
      if (result.reason === "empty") {
        setStatus("Enter both your Student ID and full name.", "fail");
        if (!inputId.value.trim()) fieldId.classList.add("error");
        if (!inputName.value.trim()) fieldName.classList.add("error");
      } else if (result.reason === "no-id") {
        setStatus("ID not found on the CSE-03 roster.", "fail");
        fieldId.classList.add("error");
      } else {
        setStatus("Name does not match this ID. Check spelling.", "fail");
        fieldName.classList.add("error");
      }

      form.classList.remove("shake");
      void form.offsetWidth; // restart animation
      form.classList.add("shake");
      return;
    }

    currentStudent = result.student;
    setStatus("Access granted. Booking ticket…", "ok");
    btnVerify.disabled = true;

    recordCheckin(currentStudent);

    setTimeout(function () {
      btnVerify.disabled = false;
      populateTicket(currentStudent);
      showScreen("ticket");
    }, 550);
  });

  // Fire-and-forget: log this check-in to the backend (Vercel only).
  // Silently does nothing if /api isn't available (e.g. local static preview).
  function recordCheckin(student) {
    fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: student.id, name: student.name }),
    }).catch(function () {
      // Ignore network errors - this must never block the ticket flow.
    });
  }

  // ---- screen 2: ticket stub --------------------------------------------
  function populateTicket(student) {
    document.getElementById("ticket-name").textContent = student.name;
    document.getElementById("ticket-id").textContent = student.id;
    document.getElementById("ticket-event").textContent =
      EVENT.titleLine1 + " " + EVENT.titleLine2;
    document.getElementById("ticket-batch").textContent = EVENT.batch;
    document.getElementById("ticket-date").textContent =
      EVENT.date + " · " + EVENT.day;
    document.getElementById("ticket-venue").textContent =
      EVENT.venuePrimary + ", " + EVENT.venueSecondary;
  }

  btnEnter.addEventListener("click", function () {
    populateReveal(currentStudent);
    showScreen("reveal");
    runGlitchSequence();
  });

  btnBack.addEventListener("click", function () {
    resetRevealAnimation();
    showScreen("ticket");
  });

  // ---- screen 3: motion reveal --------------------------------------------
  function populateReveal(student) {
    document.getElementById("reveal-name").textContent = student
      ? student.name.toUpperCase()
      : "STUDENT";
    document.getElementById("glitch-line1").textContent = EVENT.titleLine1;
    document.getElementById("glitch-line2").textContent = EVENT.titleLine2;
    document.getElementById("glitch-batch").textContent = EVENT.batch;
    document.getElementById("rd-venue1").textContent = EVENT.venuePrimary;
    document.getElementById("rd-venue2").textContent = EVENT.venueSecondary;
    document.getElementById("rd-date").textContent = EVENT.date;
    document.getElementById("rd-day").textContent = EVENT.day;
    document.getElementById("rd-doors").textContent = EVENT.doorsOpen;
  }

  function resetRevealAnimation() {
    const eyebrow = document.getElementById("reveal-eyebrow");
    const line1 = document.getElementById("glitch-line1");
    const line2 = document.getElementById("glitch-line2");
    const batch = document.getElementById("glitch-batch");
    const details = document.getElementById("reveal-details");
    const organiser = document.getElementById("reveal-organiser");
    const actions = document.getElementById("reveal-actions");

    [eyebrow, line1, line2, batch].forEach((el) => {
      el.classList.remove("run");
      el.style.opacity = 0;
    });
    details.classList.remove("show");
    organiser.classList.remove("show");
    actions.classList.remove("show");
  }

  function runGlitchSequence() {
    resetRevealAnimation();

    const eyebrow = document.getElementById("reveal-eyebrow");
    const line1 = document.getElementById("glitch-line1");
    const line2 = document.getElementById("glitch-line2");
    const batch = document.getElementById("glitch-batch");
    const details = document.getElementById("reveal-details");
    const organiser = document.getElementById("reveal-organiser");
    const actions = document.getElementById("reveal-actions");

    // Restart CSS animations cleanly on every visit to this screen.
    requestAnimationFrame(function () {
      eyebrow.style.opacity = "";
      eyebrow.style.animation = "none";
      void eyebrow.offsetWidth;
      eyebrow.style.animation = "";

      setTimeout(() => line1.classList.add("run"), 250);
      setTimeout(() => line2.classList.add("run"), 650);
      setTimeout(() => batch.classList.add("run"), 1100);
      setTimeout(() => details.classList.add("show"), 1900);
      setTimeout(() => organiser.classList.add("show"), 2300);
      setTimeout(() => actions.classList.add("show"), 2700);
    });
  }
})();