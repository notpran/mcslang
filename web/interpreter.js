class MCSInterpreter {
  constructor(code) {
      this.code = code.split("\n");
      this.variables = {};
      this.functions = {};
      this.output = "";
      this.currentLine = 0;
      this.lastExecifResult = false; // Track the result of the last `execif`
  }

  run() {
      while (this.currentLine < this.code.length) {
          let line = this.code[this.currentLine].trim();
          this.processLine(line);
          this.currentLine++;
      }
      return this.output;
  }

  processLine(line) {
      if (line.startsWith("::") || line === "") return; // Comments or empty lines

      if (line.includes("::")) {
          line = line.split("::")[0].trim(); // Remove inline comments
      }

      if (line.startsWith("place ")) {
          this.output += this.evaluate(line.slice(6)) + "\n";
          return;
      }

      if (line.startsWith("block ")) {
          const [_, varName, expression] = line.match(/block\s+(\w+)\s*=\s*(.*)/);
          this.variables[varName] = this.evaluate(expression);
          return;
      }

      if (line.startsWith("execif ")) {
          const conditionEnd = line.indexOf(":");
          const condition = line.slice(7, conditionEnd).trim();
          const body = line.slice(conditionEnd + 1).trim();

          if (this.evaluate(condition)) {
              this.lastExecifResult = true; // Track successful `execif`
              this.processLine(body);
          } else {
              this.lastExecifResult = false; // Track failed `execif`
          }
          return;
      }

      if (line.startsWith("execelse")) {
          if (!this.lastExecifResult) {
              const elseBody = line.slice(8).trim();
              if (elseBody) {
                  // Inline execelse
                  this.processLine(elseBody);
              } else {
                  // Block execelse
                  const followingLine = this.code[this.currentLine + 1]?.trim();
                  if (followingLine) {
                      this.currentLine++;
                      this.processLine(followingLine);
                  }
              }
          }
          return;
      }

      if (line.startsWith("mine ")) {
          const conditionEnd = line.indexOf(":");
          const condition = line.slice(5, conditionEnd).trim();

          const loopBody = [];
          while (!this.code[++this.currentLine].trim().startsWith("stopmine")) {
              loopBody.push(this.code[this.currentLine].trim());
          }

          while (this.evaluate(condition)) {
              for (let loopLine of loopBody) {
                  this.processLine(loopLine);
              }
          }
          return;
      }

      if (line.startsWith("craft ")) {
          const funcName = line.match(/craft\s+(\w+)/)[1];
          const funcBody = [];
          while (!this.code[++this.currentLine].trim().startsWith("crafted")) {
              funcBody.push(this.code[this.currentLine].trim());
          }
          this.functions[funcName] = funcBody;
          return;
      }

      if (line in this.functions) {
          this.runFunction(line);
          return;
      }

      throw new Error(`Unknown command: ${line}`);
  }

  runFunction(funcName) {
      const funcBody = this.functions[funcName];
      for (let line of funcBody) this.processLine(line);
  }

  evaluate(expression) {
      expression = expression.trim();

      if (expression.startsWith('"') && expression.endsWith('"')) return expression.slice(1, -1);
      if (expression === "true") return true;
      if (expression === "false") return false;
      if (this.variables.hasOwnProperty(expression)) return this.variables[expression];
      if (!isNaN(expression)) return Number(expression);

      const operators = ["==", "!=", "<=", ">=", "<", ">"];
      for (let op of operators) {
          if (expression.includes(op)) {
              const [left, right] = expression.split(op).map(part => part.trim());
              switch (op) {
                  case "==": return this.evaluate(left) === this.evaluate(right);
                  case "!=": return this.evaluate(left) !== this.evaluate(right);
                  case "<": return this.evaluate(left) < this.evaluate(right);
                  case ">": return this.evaluate(left) > this.evaluate(right);
                  case "<=": return this.evaluate(left) <= this.evaluate(right);
                  case ">=": return this.evaluate(left) >= this.evaluate(right);
              }
          }
      }

      const arithmeticOps = ["+", "-", "*", "/"];
      for (let op of arithmeticOps) {
          if (expression.includes(op)) {
              const [left, right] = expression.split(op).map(part => part.trim());
              switch (op) {
                  case "+": return this.evaluate(left) + this.evaluate(right);
                  case "-": return this.evaluate(left) - this.evaluate(right);
                  case "*": return this.evaluate(left) * this.evaluate(right);
                  case "/": return this.evaluate(left) / this.evaluate(right);
              }
          }
      }

      throw new Error(`Unknown expression: ${expression}`);
  }
}

// Import and Export Functionality
document.getElementById("import").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".mcslang";
  input.addEventListener("change", (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
          document.getElementById("code").value = e.target.result;
          updateLineCounter();
      };
      reader.readAsText(file);
  });
  input.click();
});

document.getElementById("export").addEventListener("click", () => {
  const code = document.getElementById("code").value;
  const blob = new Blob([code], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "untitled.mcslang";
  link.click();
});

// Dynamic Textarea Resizing and Line Counter
const codeInput = document.getElementById("code");

function autoResizeTextarea() {
  codeInput.style.height = "auto";
  codeInput.style.height = `${codeInput.scrollHeight}px`;
}

codeInput.addEventListener("input", () => {
  autoResizeTextarea();
});

document.addEventListener("DOMContentLoaded", () => {
  autoResizeTextarea();
});

// Run Button
document.getElementById("run").addEventListener("click", () => {
  const code = codeInput.value;
  const interpreter = new MCSInterpreter(code);
  try {
      const result = interpreter.run();
      document.getElementById("output").value = result;
  } catch (e) {
      document.getElementById("output").value = `Error: ${e.message}`;
  }
});
