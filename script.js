// Data structures
const pageTable = [
    { page: 0, frame: 3, valid: true },
    { page: 1, frame: 7, valid: true },
    { page: 2, frame: null, valid: false },
    { page: 3, frame: 1, valid: true },
    { page: 4, frame: 5, valid: true },
    { page: 5, frame: null, valid: false },
    { page: 6, frame: 0, valid: true },
    { page: 7, frame: 4, valid: true },
  ];

  const diskPages = [
    { page: 2, data: "Page 2 Data" },
    { page: 5, data: "Page 5 Data" },
    { page: 8, data: "Page 8 Data" },
    { page: 9, data: "Page 9 Data" },
  ];

  const memoryFrames = [
    { frame: 0, content: "Frame 0 (Page 6)" },
    { frame: 1, content: "Frame 1 (Page 3)" },
    { frame: 2, content: "Frame 2 (Empty)" },
    { frame: 3, content: "Frame 3 (Page 0)" },
    { frame: 4, content: "Frame 4 (Page 7)" },
    { frame: 5, content: "Frame 5 (Page 4)" },
    { frame: 6, content: "Frame 6 (Empty)" },
    { frame: 7, content: "Frame 7 (Page 1)" },
  ];

  // Utility functions
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function addText(container, text, isImmediate = false) {
    const p = document.createElement("p");
    if (isImmediate) {
      p.innerText = text;
      container.appendChild(p);
      return p;
    } else {
      container.appendChild(p);
      return new Promise((resolve) => {
        let index = 0;
        function typeChar() {
          if (index < text.length) {
            p.innerHTML += text.charAt(index++);
            setTimeout(typeChar, 30);
          } else {
            resolve(p);
          }
        }
        typeChar();
      });
    }
  }

  function createVisuals() {
    const container = document.getElementById("visualContainer");
    container.style.display = "flex";
    container.innerHTML = "";

    // Page table
    const pageTableDiv = createElement("div", "container-item");
    pageTableDiv.innerHTML = "<h3>Page Table</h3>";

    pageTable.forEach((entry) => {
      const row = createElement("div", "row", `page-row-${entry.page}`);
      row.innerHTML = `
      <span>Page ${entry.page}</span>
      <span>${entry.valid ? `Frame ${entry.frame}` : "Invalid"}</span>
    `;
      pageTableDiv.appendChild(row);
    });

    // Memory
    const memoryDiv = createElement("div", "container-item");
    memoryDiv.innerHTML = "<h3>Physical Memory</h3>";

    memoryFrames.forEach((frame) => {
      const block = createElement("div", "row", `frame-${frame.frame}`);
      block.textContent = frame.content;
      memoryDiv.appendChild(block);
    });

    // Disk
    const diskDiv = createElement("div", "container-item");
    diskDiv.innerHTML = "<h3>Disk Storage</h3>";

    diskPages.forEach((page) => {
      const block = createElement(
        "div",
        "row disk-block",
        `disk-page-${page.page}`
      );
      block.textContent = `Disk: Page ${page.page}`;
      diskDiv.appendChild(block);
    });

    container.append(pageTableDiv, memoryDiv, diskDiv);
    return { pageTableDiv, memoryDiv, diskDiv };
  }

  function createElement(type, className, id = null) {
    const el = document.createElement(type);
    if (className) el.className = className;
    if (id) el.id = id;
    return el;
  }

  async function showPageFault(pageNumber, output, pageRow) {
    // Display page fault alert
    const faultAlert = createElement("div", "page-fault");
    faultAlert.textContent = "⚠️ PAGE FAULT DETECTED ⚠️";
    output.appendChild(faultAlert);
    await sleep(1000);

    await addText(
      output,
      `The requested page ${pageNumber} is not in physical memory.`
    );
    await sleep(500);

    // Check if page is on disk
    const diskPage = diskPages.find((p) => p.page === pageNumber);

    if (diskPage) {
      await addText(output, `Found page ${pageNumber} on disk. Loading...`);

      // Highlight disk block
      const diskBlock = document.getElementById(`disk-page-${pageNumber}`);
      if (diskBlock) diskBlock.classList.add("highlight");
      await sleep(1000);

      // Create transfer animation
      const transferDiv = createElement("div", "transfer");
      output.appendChild(transferDiv);

      const dataPacket = createElement("div", "data-packet");
      transferDiv.appendChild(dataPacket);
      await sleep(500);
      dataPacket.classList.add("transferred");
      await sleep(1500);

      // Find an available frame
      const emptyFrame = memoryFrames.find((f) =>
        f.content.includes("Empty")
      );
      let frameNumber;

      if (emptyFrame) {
        frameNumber = emptyFrame.frame;
        await addText(output, `Assigned to available frame ${frameNumber}`);
      } else {
        // Page replacement
        frameNumber = Math.floor(Math.random() * memoryFrames.length);
        await addText(
          output,
          `All frames occupied. Evicting frame ${frameNumber}`
        );
      }

      // Update memory frame and page table
      memoryFrames.find(
        (f) => f.frame === frameNumber
      ).content = `Frame ${frameNumber} (Page ${pageNumber})`;
      const frameBlock = document.getElementById(`frame-${frameNumber}`);
      if (frameBlock) {
        frameBlock.textContent = `Frame ${frameNumber} (Page ${pageNumber})`;
        frameBlock.classList.add("highlight");
      }

      // Update page table entry
      const pageEntry = pageTable.find((p) => p.page === pageNumber);
      if (pageEntry) {
        pageEntry.frame = frameNumber;
        pageEntry.valid = true;
      } else {
        pageTable.push({
          page: pageNumber,
          frame: frameNumber,
          valid: true,
        });
      }

      // Update page table UI
      if (pageRow) {
        pageRow.innerHTML = `
        <span>Page ${pageNumber}</span>
        <span>Frame ${frameNumber}</span>
      `;
        pageRow.classList.add("highlight");
      }

      await sleep(1000);
      return frameNumber;
    } else {
      await addText(output, `Error: Page ${pageNumber} not found on disk.`);
      const errorDiv = createElement("div", "error");
      errorDiv.textContent = "✗ Segmentation Fault";
      output.appendChild(errorDiv);
      return null;
    }
  }

  async function startMapping() {
    const vAddressInput = document
      .getElementById("virtualAddressInput")
      .value.trim();
    const pageSizeInput = parseInt(
      document.getElementById("pageSizeInput").value.trim(),
      10
    );
    const forcePageFault =
      document.getElementById("forcePageFault").checked;
    const output = document.getElementById("output");
    const finalResult = document.getElementById("finalResult");
    output.innerHTML = "";
    finalResult.innerHTML = "";

    // Convert address
    let vAddress = vAddressInput.startsWith("0x")
      ? parseInt(vAddressInput.slice(2), 16)
      : parseInt(vAddressInput, 16);

    const binaryAddress = vAddress.toString(2).padStart(16, "0");
    const offsetBits = Math.log2(pageSizeInput);

    // Display address info
    addText(output, `Virtual Address: ${vAddressInput}`, true);
    addText(output, `Binary: ${binaryAddress}`, true);
    await sleep(1000);

    await addText(
      output,
      `Page Size: ${pageSizeInput} bytes (2^${offsetBits} bits)`
    );
    await sleep(500);

    // Split binary address
    const offsetPart = binaryAddress.slice(-offsetBits);
    const pagePart = binaryAddress.slice(
      0,
      binaryAddress.length - offsetBits
    );

    await addText(output, `Split Binary:`);

    const splitDiv = createElement("div", "split-binary");
    splitDiv.innerHTML = `
    <span class="page-bits">${pagePart}</span>
    <span style="margin-left: 15px;"></span>
    <span class="offset-bits">${offsetPart}</span>
  `;
    output.appendChild(splitDiv);

    const labelsDiv = createElement("div", "labels");
    labelsDiv.innerHTML = `
    <span class="page-label">(Page Number)</span>
    <span style="margin-left: ${offsetPart.length * 10}px;"></span>
    <span class="offset-label">(Offset)</span>
  `;
    output.appendChild(labelsDiv);
    await sleep(500);

    // Calculate decimal values
    const pageNumber = parseInt(pagePart || "0", 2);
    const offsetDecimal = parseInt(offsetPart || "0", 2);

    await addText(output, `**Page Number: ${pageNumber}**`);
    await addText(output, `Offset: ${offsetDecimal}`);
    await sleep(1000);

    // Page table lookup
    const lookupText = await addText(
      output,
      "Looking up page in page table..."
    );

    // Create visual elements
    const { pageTableDiv, memoryDiv, diskDiv } = createVisuals();
    await sleep(1000);

    // Find or create page entry
    let pageEntry = pageTable.find((entry) => entry.page === pageNumber);
    if (!pageEntry) {
      pageEntry = { page: pageNumber, frame: null, valid: false };
      pageTable.push(pageEntry);

      // Add new page to UI
      const row = createElement("div", "row", `page-row-${pageNumber}`);
      row.innerHTML = `
      <span>Page ${pageNumber}</span>
      <span>Invalid</span>
    `;
      pageTableDiv.appendChild(row);
    }

    // Force page fault if needed
    if (forcePageFault) {
      pageEntry.valid = false;
      pageEntry.frame = null;
      const pageRow = document.getElementById(`page-row-${pageNumber}`);
      if (pageRow) {
        pageRow.innerHTML = `
        <span>Page ${pageNumber}</span>
        <span>Invalid</span>
      `;
      }
    }

    // Highlight the page row
    const pageRow = document.getElementById(`page-row-${pageNumber}`);
    if (pageRow) pageRow.classList.add("highlight");
    await sleep(1000);

    let frameNumber;

    // Check for page fault
    if (!pageEntry.valid || pageEntry.frame === null) {
      lookupText.innerHTML += " <strong>PAGE FAULT!</strong>";
      frameNumber = await showPageFault(pageNumber, output, pageRow);
      if (frameNumber === null) return; // Error occurred
    } else {
      // No page fault
      lookupText.innerHTML += " Found!";
      frameNumber = pageEntry.frame;
      await sleep(500);
      await addText(
        output,
        `Found mapping: Page ${pageNumber} → Frame ${frameNumber}`
      );

      // Highlight frame
      const frameBlock = document.getElementById(`frame-${frameNumber}`);
      if (frameBlock) frameBlock.classList.add("highlight");
    }

    await sleep(1000);

    // Calculate physical address
    const physicalAddress = frameNumber * pageSizeInput + offsetDecimal;

    await addText(output, "Calculating physical address...");

    const calculation = createElement("div");
    calculation.innerHTML = `
    <p>Physical Address = (Frame × Page Size) + Offset</p>
    <p>Physical Address = (${frameNumber} × ${pageSizeInput}) + ${offsetDecimal}</p>
    <p>Physical Address = ${
      frameNumber * pageSizeInput
    } + ${offsetDecimal}</p>
    <p>Physical Address = ${physicalAddress}</p>
  `;
    output.appendChild(calculation);

    // Display final result
    const physicalHex = "0x" + physicalAddress.toString(16).toUpperCase();
    const resultDiv = createElement("div", "result");
    resultDiv.innerHTML = `<strong>Final Physical Address:</strong> ${physicalHex} (${physicalAddress})`;
    finalResult.appendChild(resultDiv);
  }

  async function demoPageFault() {
    const demoPage = 2;
    const output = document.getElementById("output");
    const finalResult = document.getElementById("finalResult");
    output.innerHTML = "";
    finalResult.innerHTML = "";

    // Title
    const title = createElement("h2");
    title.textContent = "Page Fault Demo";
    title.style.color = "#ff3333";
    output.appendChild(title);

    await addText(
      output,
      "A page fault occurs when the CPU references a page not in physical memory."
    );
    await addText(
      output,
      `Demonstrating page fault for Page ${demoPage}...`
    );

    const { pageTableDiv, memoryDiv, diskDiv } = createVisuals();

    // Ensure demo page is invalid
    let pageEntry = pageTable.find((p) => p.page === demoPage);
    if (pageEntry) {
      pageEntry.valid = false;
      pageEntry.frame = null;
    } else {
      pageTable.push({ page: demoPage, frame: null, valid: false });
    }

    // Update UI
    const pageRow = document.getElementById(`page-row-${demoPage}`);
    if (pageRow) {
      pageRow.innerHTML = `<span>Page ${demoPage}</span><span>Invalid</span>`;
    }

    // Step by step explanation
    const steps = [
      "Step 1: CPU requests a page",
      "Step 2: MMU checks page table",
      "Step 3: Page fault triggered",
      "Step 4: CPU interrupted, fault handler takes over",
      "Step 5: Checking if page is on disk",
      "Step 6: Finding available frame",
      "Step 7: Loading page from disk",
      "Step 8: Updating page table",
      "Step 9: CPU resumes execution",
    ];

    // Show first two steps
    await addText(output, steps[0]);
    await sleep(1000);

    await addText(output, steps[1]);
    if (pageRow) pageRow.classList.add("highlight");
    await sleep(1000);

    // Page fault alert
    const faultAlert = createElement("div", "page-fault");
    faultAlert.textContent = "⚠️ PAGE FAULT DETECTED ⚠️";
    output.appendChild(faultAlert);
    await sleep(1000);

    // Remaining steps
    await addText(output, steps[2]);
    await sleep(1000);

    await addText(output, steps[3]);
    await sleep(1000);

    await addText(output, steps[4]);
    const diskPage = diskPages.find((p) => p.page === demoPage);

    if (diskPage) {
      // Highlight disk
      const diskBlock = document.getElementById(`disk-page-${demoPage}`);
      if (diskBlock) diskBlock.classList.add("highlight");

      await sleep(1000);
      await addText(output, `Found Page ${demoPage} on disk!`);

      // Find frame
      await sleep(1000);
      await addText(output, steps[5]);

      const emptyFrame = memoryFrames.find((f) =>
        f.content.includes("Empty")
      );
      let frameNumber;

      if (emptyFrame) {
        frameNumber = emptyFrame.frame;
        await addText(output, `Found available Frame ${frameNumber}`);
      } else {
        frameNumber = Math.floor(Math.random() * memoryFrames.length);
        await addText(
          output,
          `Selected Frame ${frameNumber} for replacement`
        );
      }

      // Load from disk
      await sleep(1000);
      await addText(output, steps[6]);

      const transferDiv = createElement("div", "transfer");
      output.appendChild(transferDiv);

      const dataPacket = createElement("div", "data-packet");
      transferDiv.appendChild(dataPacket);
      await sleep(500);
      dataPacket.classList.add("transferred");
      await sleep(1500);

      // Update frame
      memoryFrames.find(
        (f) => f.frame === frameNumber
      ).content = `Frame ${frameNumber} (Page ${demoPage})`;
      const frameBlock = document.getElementById(`frame-${frameNumber}`);
      if (frameBlock) {
        frameBlock.textContent = `Frame ${frameNumber} (Page ${demoPage})`;
        frameBlock.classList.add("highlight");
      }

      // Update page table
      await sleep(1000);
      await addText(output, steps[7]);

      pageEntry.frame = frameNumber;
      pageEntry.valid = true;

      if (pageRow) {
        pageRow.innerHTML = `
        <span>Page ${demoPage}</span>
        <span>Frame ${frameNumber}</span>
      `;
        pageRow.classList.add("highlight");
      }

      // Resume execution
      await sleep(1000);
      await addText(output, steps[8]);

      // Success message
      const successDiv = createElement("div", "success");
      successDiv.textContent = "✓ Page Fault Resolved!";
      output.appendChild(successDiv);

      // Show final mapping
      const finalMapping = createElement("div", "result");
      finalMapping.innerHTML = `<strong>Final Mapping:</strong> Page ${demoPage} → Frame ${frameNumber}`;
      finalResult.appendChild(finalMapping);
    } else {
      await addText(output, `Error: Page ${demoPage} not found on disk!`);

      const errorDiv = createElement("div", "error");
      errorDiv.textContent = "✗ Segmentation Fault";
      output.appendChild(errorDiv);
    }
  }