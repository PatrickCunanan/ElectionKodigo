(function () {
  "use strict";

  const config = window.electionConfig;
  const form = document.getElementById("kodigo-form");
  const ballot = document.getElementById("ballot");
  const status = document.getElementById("selection-status");
  const printContent = document.getElementById("print-content");

  function formatNumber(number) {
    return String(number).padStart(2, "0");
  }

  function createCandidateLabel(office, number) {
    return `${formatNumber(number)}. ${office.candidateLabel} ${formatNumber(number)} — PLACEHOLDER`;
  }

  function renderOffice(office) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "office";
    fieldset.id = `office-${office.id}`;
    fieldset.dataset.office = office.id;
    fieldset.tabIndex = -1;

    const legend = document.createElement("legend");
    const choiceLimit =
      office.id === "senator"
        ? `choose up to ${office.selectionLimit}`
        : `choose ${office.selectionLimit}`;
    legend.textContent = `${office.label} (${choiceLimit})`;
    fieldset.append(legend);

    const help = document.createElement("p");
    help.className = "office-help";
    help.textContent =
      office.id === "senator"
        ? `Choose up to ${office.selectionLimit}.`
        : "Choose one.";
    fieldset.append(help);

    const options = document.createElement("div");
    options.className = "candidate-grid";

    for (let number = 1; number <= office.placeholderCount; number += 1) {
      const id = `candidate-${office.id}-${number}`;
      const option = document.createElement("div");
      option.className = "candidate-option";

      const input = document.createElement("input");
      input.className = "candidate-input";
      input.type = office.selectionLimit === 1 ? "radio" : "checkbox";
      input.id = id;
      input.name = office.id;
      input.value = createCandidateLabel(office, number);
      input.dataset.number = String(number);

      if (input.type === "radio") {
        input.required = true;
      }

      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = input.value;

      option.append(input, label);
      options.append(option);
    }

    fieldset.append(options);
    return fieldset;
  }

  function renderBallot() {
    const fragment = document.createDocumentFragment();
    config.offices.forEach((office) => fragment.append(renderOffice(office)));
    ballot.append(fragment);
  }

  function getSelections(officeId) {
    return Array.from(
      form.querySelectorAll(`input[name="${officeId}"]:checked`)
    );
  }

  function showStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("status-error", isError);
  }

  function renderPrintContent(selections) {
    printContent.replaceChildren();

    const heading = document.createElement("h1");
    heading.textContent = `${config.election} — Voting Reference`;
    printContent.append(heading);

    const notice = document.createElement("p");
    notice.className = "print-notice";
    notice.textContent = `${config.status} — replace and verify every entry against official election information before use.`;
    printContent.append(notice);

    config.offices.forEach((office) => {
      const selected = selections[office.id];
      if (selected.length === 0) {
        return;
      }

      const section = document.createElement("section");
      const officeHeading = document.createElement("h2");
      officeHeading.textContent = office.label;
      const list = document.createElement("ul");

      selected.forEach((input) => {
        const item = document.createElement("li");
        item.textContent = input.value;
        list.append(item);
      });

      section.append(officeHeading, list);
      printContent.append(section);
    });
  }

  function handlePrint() {
    const selections = Object.fromEntries(
      config.offices.map((office) => [office.id, getSelections(office.id)])
    );
    const missingOffices = config.offices
      .filter(
        (office) =>
          office.selectionLimit === 1 && selections[office.id].length === 0
      )
      .map((office) => office.label);

    if (selections.senator.length === 0) {
      missingOffices.push("at least one Senator");
    }

    if (missingOffices.length > 0) {
      showStatus(
        `Make a selection for: ${missingOffices.join(", ")} before printing.`,
        true
      );
      const firstMissingOffice = config.offices.find(
        (office) =>
          (office.selectionLimit === 1 &&
            selections[office.id].length === 0) ||
          (office.id === "senator" && selections.senator.length === 0)
      );
      document.getElementById(`office-${firstMissingOffice.id}`).focus();
      return;
    }

    renderPrintContent(selections);
    showStatus("Opening the print dialog.", false);
    window.print();
  }

  function handleSenatorChange(event) {
    if (!event.target.matches('input[name="senator"]:checked')) {
      return;
    }

    const selected = getSelections("senator");
    const senatorLimit = config.offices.find(
      (office) => office.id === "senator"
    ).selectionLimit;
    if (selected.length > senatorLimit) {
      event.target.checked = false;
      showStatus(`You can select up to ${senatorLimit} Senators.`, true);
      return;
    }

    showStatus(`${selected.length} of ${senatorLimit} Senators selected.`, false);
  }

  function handleReset() {
    showStatus("Selections cleared.", false);
    printContent.replaceChildren();
  }

  if (!config || !form || !ballot || !status || !printContent) {
    throw new Error("Election ballot configuration or page elements are missing.");
  }

  renderBallot();
  ballot.addEventListener("change", handleSenatorChange);
  document.getElementById("print-button").addEventListener("click", handlePrint);
  document.getElementById("reset-button").addEventListener("click", handleReset);
})();
