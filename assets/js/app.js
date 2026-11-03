(function () {
  "use strict";

  const config = window.electionConfig;
  const form = document.getElementById("kodigo-form");
  const ballot = document.getElementById("ballot");
  const selectionSummary = document.getElementById("selection-summary");
  const status = document.getElementById("selection-status");
  const imageOutput = document.getElementById("image-output");
  const referenceImage = document.getElementById("reference-image");
  const downloadImageLink = document.getElementById("download-image-link");
  let imageUrl = null;
  let selectionRevision = 0;

  function formatNumber(number) {
    return String(number).padStart(2, "0");
  }

  function createImageFilename() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");
    return `may-2028-voting-reference-${timestamp}.png`;
  }

  function createCandidateLabel(office, number) {
    return `${formatNumber(number)}. ${office.candidateLabel} ${formatNumber(number)} — PLACEHOLDER`;
  }

  function renderOffice(office) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = `office office-${office.id}`;
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
    options.style.gridTemplateRows = `repeat(${Math.ceil(
      office.placeholderCount / 3
    )}, auto)`;

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
      const numberBadge = document.createElement("span");
      numberBadge.className = "candidate-number";
      numberBadge.textContent = formatNumber(number);

      const candidateName = document.createElement("span");
      candidateName.className = "candidate-name";
      candidateName.textContent = input.value.slice(4);
      label.append(numberBadge, candidateName);

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

  function updateSelectionSummary() {
    selectionSummary.textContent = config.offices
      .map((office) => {
        const selectedCount = getSelections(office.id).length;
        if (office.id === "senator") {
          return `Senators: ${selectedCount} of ${office.selectionLimit}`;
        }
        return `${office.label}: ${
          selectedCount > 0 ? "chosen" : "not chosen"
        }`;
      })
      .join(" | ");
  }

  function showStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("status-error", isError);
  }

  function clearImagePreview() {
    const hadImage = !imageOutput.hidden;
    imageOutput.hidden = true;
    referenceImage.removeAttribute("src");
    downloadImageLink.removeAttribute("href");
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      imageUrl = null;
    }
    return hadImage;
  }

  function wrapText(context, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });

    if (line) {
      lines.push(line);
    }

    return lines;
  }

  function createReferenceCanvas(selections) {
    const width = 720;
    const phoneHeight = 1280;
    const scale = 1.5;
    const left = 54;
    const contentWidth = width - left * 2;
    const sectionLayouts = [];
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");

    if (!measureContext) {
      throw new Error("Canvas is not supported in this browser.");
    }

    measureContext.font = '19px "Segoe UI", "Helvetica Neue", Arial, sans-serif';

    let contentBottom = 174;
    config.offices.forEach((office) => {
      const selected = selections[office.id];
      if (selected.length === 0) {
        return;
      }

      const items = selected.map((input, row) => ({
        input,
        lines: wrapText(measureContext, input.value, contentWidth - 74),
        row,
      }));
      const rowHeights = items.map((item) =>
        Math.max(42, item.lines.length * 25 + 16)
      );
      const sectionHeight =
        44 + rowHeights.reduce((sum, value) => sum + value, 0);

      sectionLayouts.push({
        office,
        items,
        rowHeights,
        top: contentBottom,
        height: sectionHeight,
      });
      contentBottom += sectionHeight + 16;
    });
    const height = Math.max(phoneHeight, contentBottom + 76);

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not supported in this browser.");
    }

    context.scale(scale, scale);
    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#18364a";
    for (let y = 12; y < height; y += 24) {
      context.fillRect(14, y, 12, 12);
      context.fillRect(width - 26, y, 12, 12);
    }
    context.strokeStyle = "#18364a";
    context.lineWidth = 1.5;
    context.strokeRect(35, 18, width - 70, height - 36);

    context.textAlign = "center";
    context.fillStyle = "#547080";
    context.font = '600 17px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    context.fillText(config.election.toUpperCase(), width / 2, 54);
    context.fillStyle = "#18364a";
    context.font = '700 27px Georgia, "Times New Roman", serif';
    context.fillText("Personal voting reference", width / 2, 96);
    context.fillStyle = "#9a5a29";
    context.font = '700 14px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    context.fillText(config.status, width / 2, 132);

    context.textAlign = "left";
    sectionLayouts.forEach((layout) => {
      const { office, items, rowHeights, top } = layout;
      context.fillStyle = "#eaf0ee";
      context.fillRect(left, top, contentWidth, 44);
      context.strokeStyle = "#b8c8c6";
      context.lineWidth = 1.5;
      context.strokeRect(left, top, contentWidth, layout.height);
      context.fillStyle = "#18364a";
      context.font = '700 16px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
      context.fillText(
        `${office.label.toUpperCase()} — SELECTED`,
        left + 18,
        top + 29
      );

      let rowTop = top + 44;
      for (let row = 0; row < items.length; row += 1) {
        context.strokeStyle = "#d8e0de";
        context.beginPath();
        context.moveTo(left, rowTop + rowHeights[row]);
        context.lineTo(left + contentWidth, rowTop + rowHeights[row]);
        context.stroke();

        const item = items[row];
        const itemLeft = left + 18;
        const boxTop = rowTop + 11;
        context.strokeStyle = "#26746c";
        context.lineWidth = 2;
        context.strokeRect(itemLeft, boxTop, 17, 17);
        context.beginPath();
        context.moveTo(itemLeft + 3, boxTop + 9);
        context.lineTo(itemLeft + 7, boxTop + 13);
        context.lineTo(itemLeft + 14, boxTop + 4);
        context.stroke();

        context.fillStyle = "#243746";
        context.font = '19px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
        item.lines.forEach((line, index) => {
          context.fillText(line, itemLeft + 29, rowTop + 25 + index * 25);
        });

        rowTop += rowHeights[row];
      }
    });

    context.fillStyle = "#647783";
    context.textAlign = "center";
    context.font = '17px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    context.fillText(
      "PLACEHOLDER DATA — verify all entries with official election information.",
      width / 2,
      height - 44
    );
    context.fillText(
      "Personal reference only. Follow current election rules.",
      width / 2,
      height - 23
    );

    return canvas;
  }

  async function createImage() {
    const requestRevision = selectionRevision;
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
        `Make a selection for: ${missingOffices.join(", ")} before creating the image.`,
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

    let canvas;
    try {
      canvas = createReferenceCanvas(selections);
    } catch (error) {
      showStatus(error.message, true);
      return;
    }

    let blob;
    try {
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob(resolve, "image/png");
      });
    } catch (error) {
      showStatus(`The PNG image could not be created: ${error.message}`, true);
      return;
    }

    if (requestRevision !== selectionRevision) {
      showStatus(
        "Your selections changed while creating the image. Create the PNG again.",
        true
      );
      return;
    }

    if (!blob) {
      showStatus("The PNG image could not be created. Try another browser.", true);
      return;
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    imageUrl = URL.createObjectURL(blob);
    referenceImage.src = imageUrl;
    referenceImage.alt = [
      `${config.election} personal voting reference.`,
      ...config.offices.flatMap((office) => {
        const selected = selections[office.id];
        return selected.length > 0
          ? [`${office.label}: ${selected.map((input) => input.value).join(", ")}`]
          : [];
      }),
    ].join(" ");
    downloadImageLink.href = imageUrl;
    downloadImageLink.download = createImageFilename();
    imageOutput.hidden = false;
    imageOutput.scrollIntoView({ behavior: "smooth", block: "start" });
    showStatus(
      "PNG created. Use the preview or select Download PNG to save the image.",
      false
    );
  }

  function handleBallotChange(event) {
    if (
      event.target.matches('input[name="senator"]:checked') &&
      getSelections("senator").length >
        config.offices.find((office) => office.id === "senator").selectionLimit
    ) {
      event.target.checked = false;
      const senatorLimit = config.offices.find(
        (office) => office.id === "senator"
      ).selectionLimit;
      updateSelectionSummary();
      showStatus(`You can select up to ${senatorLimit} Senators.`, true);
      return;
    }

    selectionRevision += 1;
    updateSelectionSummary();
    const previewWasCleared = clearImagePreview();
    if (event.target.name === "senator") {
      const senatorLimit = config.offices.find(
        (office) => office.id === "senator"
      ).selectionLimit;
      showStatus(
        `${getSelections("senator").length} of ${senatorLimit} Senators selected.${
          previewWasCleared ? " Create a new PNG to update the image." : ""
        }`,
        false
      );
    } else if (previewWasCleared) {
      showStatus("Selections changed. Create a new PNG to update the image.", false);
    }
  }

  function handleReset() {
    selectionRevision += 1;
    window.setTimeout(() => {
      updateSelectionSummary();
      showStatus("Selections cleared.", false);
      clearImagePreview();
    }, 0);
  }

  if (
    !config ||
    !form ||
    !ballot ||
    !selectionSummary ||
    !status ||
    !imageOutput ||
    !referenceImage ||
    !downloadImageLink
  ) {
    throw new Error("Election ballot configuration or page elements are missing.");
  }

  renderBallot();
  updateSelectionSummary();
  ballot.addEventListener("change", handleBallotChange);
  document
    .getElementById("create-image-button")
    .addEventListener("click", createImage);
  document.getElementById("reset-button").addEventListener("click", handleReset);
})();
