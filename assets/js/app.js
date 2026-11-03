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
    const width = 1200;
    const scale = 2;
    const left = 80;
    const contentWidth = width - left * 2;
    const sectionLayouts = [];
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");

    if (!measureContext) {
      throw new Error("Canvas is not supported in this browser.");
    }

    measureContext.font = '22px "Segoe UI", "Helvetica Neue", Arial, sans-serif';

    let height = 190;
    config.offices.forEach((office) => {
      const selected = selections[office.id];
      if (selected.length === 0) {
        return;
      }

      const columns = office.id === "senator" ? 2 : 1;
      const rows = Math.ceil(selected.length / columns);
      const columnWidth = contentWidth / columns;
      const items = selected.map((input) => {
        const lines = wrapText(measureContext, input.value, columnWidth - 68);
        return {
          input,
          lines,
          column: Math.floor(selected.indexOf(input) / rows),
          row: selected.indexOf(input) % rows,
        };
      });
      const rowHeights = Array.from({ length: rows }, (_, row) => {
        const rowItems = items.filter((item) => item.row === row);
        return Math.max(
          42,
          ...rowItems.map((item) => item.lines.length * 28 + 16)
        );
      });
      const sectionHeight = 48 + rowHeights.reduce((sum, value) => sum + value, 0);

      sectionLayouts.push({
        office,
        items,
        rows,
        columns,
        columnWidth,
        rowHeights,
        top: height,
        height: sectionHeight,
      });
      height += sectionHeight + 20;
    });
    height += 82;

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
    for (let y = 12; y < height; y += 28) {
      context.fillRect(22, y, 18, 18);
      context.fillRect(width - 40, y, 18, 18);
    }
    context.strokeStyle = "#18364a";
    context.lineWidth = 2;
    context.strokeRect(51, 22, width - 102, height - 44);

    context.textAlign = "center";
    context.fillStyle = "#547080";
    context.font = '600 23px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    context.fillText(config.election.toUpperCase(), width / 2, 67);
    context.fillStyle = "#18364a";
    context.font = '700 36px Georgia, "Times New Roman", serif';
    context.fillText("Personal voting reference", width / 2, 116);
    context.fillStyle = "#9a5a29";
    context.font = '700 18px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    context.fillText(config.status, width / 2, 153);

    context.textAlign = "left";
    sectionLayouts.forEach((layout) => {
      const { office, items, columns, columnWidth, rowHeights, top } = layout;
      context.fillStyle = "#eaf0ee";
      context.fillRect(left, top, contentWidth, 48);
      context.strokeStyle = "#b8c8c6";
      context.lineWidth = 1.5;
      context.strokeRect(left, top, contentWidth, layout.height);
      context.fillStyle = "#18364a";
      context.font = '700 21px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
      context.fillText(
        `${office.label.toUpperCase()} — SELECTED`,
        left + 18,
        top + 32
      );

      let rowTop = top + 48;
      for (let row = 0; row < layout.rows; row += 1) {
        context.strokeStyle = "#d8e0de";
        context.beginPath();
        context.moveTo(left, rowTop + rowHeights[row]);
        context.lineTo(left + contentWidth, rowTop + rowHeights[row]);
        context.stroke();

        for (let column = 0; column < columns; column += 1) {
          const item = items.find(
            (entry) => entry.row === row && entry.column === column
          );
          if (!item) {
            continue;
          }

          const itemLeft = left + column * columnWidth + 18;
          const boxTop = rowTop + 12;
          context.strokeStyle = "#26746c";
          context.lineWidth = 2.5;
          context.strokeRect(itemLeft, boxTop, 20, 20);
          context.beginPath();
          context.moveTo(itemLeft + 4, boxTop + 10);
          context.lineTo(itemLeft + 8, boxTop + 15);
          context.lineTo(itemLeft + 17, boxTop + 5);
          context.stroke();

          context.fillStyle = "#243746";
          context.font = '22px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
          item.lines.forEach((line, index) => {
            context.fillText(
              line,
              itemLeft + 32,
              rowTop + 30 + index * 28,
              columnWidth - 58
            );
          });
        }

        rowTop += rowHeights[row];
      }
    });

    context.fillStyle = "#647783";
    context.textAlign = "center";
    context.font = '17px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    context.fillText(
      "PLACEHOLDER DATA — verify all entries with official election information.",
      width / 2,
      height - 49
    );
    context.fillText(
      "Personal reference only. Follow current election rules.",
      width / 2,
      height - 25
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
