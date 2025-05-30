let fileSystem = {};
let currentFile = null;
let interpreters = {};  // Store interpreter instances for each file

function saveFile(name, content) {
    fileSystem[name] = content;
    localStorage.setItem("mcs-files", JSON.stringify(fileSystem));
}

function loadFile(name) {
    return fileSystem[name] || "";
}

function createTab(name) {
    const tab = document.createElement("div");
    tab.className = "tab";
    
    const tabName = document.createElement("span");
    tabName.textContent = name;
    tab.appendChild(tabName);
    
    const closeBtn = document.createElement("span");
    closeBtn.className = "tab-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeTab(name);
    };
    tab.appendChild(closeBtn);
    
    tab.onclick = () => switchTab(name);
    document.getElementById("tab-bar").appendChild(tab);
}

function closeTab(name) {
    delete fileSystem[name];
    delete interpreters[name];  // Clean up the interpreter instance
    localStorage.setItem("mcs-files", JSON.stringify(fileSystem));
    
    const tab = Array.from(document.querySelectorAll(".tab")).find(
        t => t.firstChild.textContent === name
    );
    if (tab) tab.remove();
    
    if (currentFile === name) {
        const remainingFiles = Object.keys(fileSystem);
        if (remainingFiles.length > 0) {
            switchTab(remainingFiles[0]);
        } else {
            currentFile = null;
            document.getElementById("code").value = "";
            document.getElementById("output").value = "";
        }
    }
}

function switchTab(name) {
    if (currentFile) {
        saveFile(currentFile, document.getElementById("code").value);
    }
    currentFile = name;
    const content = loadFile(name);
    document.getElementById("code").value = content;
    updateLineNumbers(content);

    document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.remove("active");
        if (tab.firstChild.textContent === name) tab.classList.add("active");
    });

    // Reset the interpreter for the new file
    interpreters[name] = null;
    document.getElementById("output").value = "";
}

function updateLineNumbers(content) {
    const lines = content.split("\n");
    const lineCount = Math.max(16, lines.length);
    const lineNumbers = document.getElementById("line-numbers");
    const codeArea = document.getElementById("code");
    const lineHeight = parseFloat(getComputedStyle(codeArea).lineHeight);
    const numbers = [];
    
    for (let i = 0; i < lineCount; i++) {
        numbers.push(`<div class="line-number" style="height: ${lineHeight}px">${i + 1}</div>`);
    }
    
    lineNumbers.innerHTML = numbers.join("");
}

// Create hidden file input element
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.mcslang';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

document.getElementById("newFile").addEventListener("click", () => {
  const name = prompt("New file name:");
  if (!name) return;
  const fileName = name.endsWith('.mcslang') ? name : name + '.mcslang';
  if (fileSystem[fileName]) return alert("File name already exists.");
  fileSystem[fileName] = "";
  createTab(fileName);
  switchTab(fileName);
});

document.getElementById("importFile").addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const fileName = file.name;
    if (fileSystem[fileName] && !confirm(`File ${fileName} already exists. Override?`)) {
      return;
    }
    fileSystem[fileName] = content;
    createTab(fileName);
    switchTab(fileName);
  };
  reader.readAsText(file);
  // Reset file input
  fileInput.value = '';
});

document.getElementById("saveFile").addEventListener("click", () => {
  if (!currentFile) return alert("No file selected.");
  
  const content = document.getElementById("code").value;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = currentFile;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  // Also save to local storage
  saveFile(currentFile, content);
});

document.getElementById("run").addEventListener("click", () => {
  if (!currentFile) return alert("No file selected.");
  saveFile(currentFile, document.getElementById("code").value);

  const output = document.getElementById("output");
  output.value = "";
  output.setAttribute("readonly", true);
  
  // Create a new interpreter instance and store it
  interpreters[currentFile] = new MCSInterpreter(fileSystem[currentFile], fileSystem);
  try {
    const result = interpreters[currentFile].run();
    output.value = result;
    
    // Make editable only if waiting for input
    if (interpreters[currentFile].waiting?.type === "input") {
      output.removeAttribute("readonly");
    }
  } catch (e) {
    output.value = `Error: ${e.message}`;
  }
});

// Add function to auto-resize output textarea
// Remove autoResizeOutput function since we're using fixed height with scrolling

// Remove MutationObserver since we're not auto-resizing anymore

// Handle input in the output textarea
document.getElementById("output").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        
        const currentInterpreter = interpreters[currentFile];
        if (!currentInterpreter?.waiting) return;
        
        const output = document.getElementById("output");
        const lines = output.value.split("\n");
        const input = lines[lines.length - 1];
        
        try {
            // Store the input and continue execution
            currentInterpreter.validateAndStoreInput(currentInterpreter.waiting.varName, input);
            currentInterpreter.waiting = null;
            
            // Make output readonly again
            output.setAttribute("readonly", true);
            
            // Add newline after input
            output.value = lines.join("\n") + "\n";
            
            // Run the interpreter to get next output
            const result = currentInterpreter.run();
            output.value = result;
            
            // Make editable again if waiting for more input
            if (currentInterpreter.waiting?.type === "input") {
                output.removeAttribute("readonly");
            }
        } catch (e) {
            // Handle error
            output.value = lines.join('\n') + "\nError: " + e.message;
            
            // Keep editable if there was an error during input
            if (currentInterpreter.waiting?.type === "input") {
                output.removeAttribute("readonly");
            } else {
                output.setAttribute("readonly", true);
            }
        }
    }
});

// Removed old runInterpreter function since its functionality is now in the keydown handler

// Handle code input and update line numbers
document.getElementById("code").addEventListener("input", (e) => {
  updateLineNumbers(e.target.value);
});

// Sync line numbers scroll with code scroll
document.getElementById("code").addEventListener("scroll", function() {
    const lineNumbers = document.getElementById("line-numbers");
    lineNumbers.scrollTop = this.scrollTop;
    
    // Force a repaint to fix any visual glitches
    lineNumbers.style.transform = 'translateZ(0)';
});

// Handle tab key in textarea
document.getElementById("code").addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const value = e.target.value;
    e.target.value = value.substring(0, start) + "    " + value.substring(end);
    e.target.selectionStart = e.target.selectionEnd = start + 4;
    updateLineNumbers(e.target.value);
  }
});

window.onload = () => {
  const saved = JSON.parse(localStorage.getItem("mcs-files") || "{}");
  fileSystem = saved;
  const files = Object.keys(saved);
  
  if (files.length > 0) {
    files.forEach(createTab);
    switchTab(files[0]);
  } else {
    // Auto-create a new file if none exist
    const defaultCode = ":: Welcome to MCSlang!\n:: Start coding here...";
    const name = "untitled.mcslang";
    fileSystem[name] = defaultCode;
    createTab(name);
    switchTab(name);
  }
};
