let fileSystem = {};
let currentFile = null;

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
  tab.textContent = name;
  tab.onclick = () => switchTab(name);
  document.getElementById("tab-bar").appendChild(tab);
}

function switchTab(name) {
  if (currentFile) {
    saveFile(currentFile, document.getElementById("code").value);
  }
  currentFile = name;
  document.getElementById("code").value = loadFile(name);

  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
    if (tab.textContent === name) tab.classList.add("active");
  });
}

document.getElementById("newFile").addEventListener("click", () => {
  const name = prompt("New file name:");
  if (!name || fileSystem[name]) return alert("Invalid or duplicate name.");
  fileSystem[name] = "";
  createTab(name);
  switchTab(name);
});

document.getElementById("saveFile").addEventListener("click", () => {
  if (!currentFile) return alert("No file selected.");
  saveFile(currentFile, document.getElementById("code").value);
});

document.getElementById("run").addEventListener("click", () => {
  if (!currentFile) return alert("No file selected.");
  saveFile(currentFile, document.getElementById("code").value);

  const interpreter = new MCSInterpreter(fileSystem[currentFile], fileSystem);
  try {
    const result = interpreter.run();
    document.getElementById("output").value = result;
  } catch (e) {
    document.getElementById("output").value = `Error: ${e.message}`;
  }
});

window.onload = () => {
  const saved = JSON.parse(localStorage.getItem("mcs-files") || "{}");
  fileSystem = saved;
  const files = Object.keys(saved);
  if (files.length > 0) {
    files.forEach(createTab);
    switchTab(files[0]);
  }
};
