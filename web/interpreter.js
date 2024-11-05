document.getElementById("runButton").addEventListener("click", runCode);

function runCode() {
  const code = document.getElementById("code").value;
  const outputDiv = document.getElementById("output");
  outputDiv.innerText = "";  // Clear previous output

  try {
    const interpreter = new MCSInterpreter(code);
    const output = interpreter.run();
    outputDiv.innerText = output;
  } catch (error) {
    outputDiv.innerText = "Error: " + error.message;
  }
}

class MCSInterpreter {
  constructor(code) {
    this.code = code.split("\n");
    this.variables = {};
    this.functions = {};
    this.output = "";
    this.currentLine = 0;
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
    // Handle full-line comments or empty lines
    if (line.startsWith("::") || line === "") return;

    // Remove inline comments (anything after '::')
    if (line.includes("::")) {
      line = line.split("::")[0].trim();
    }

    // Print command (place)
    if (line.startsWith("place ")) {
      this.output += this.evaluate(line.slice(6)) + "\n";
      return;
    }

    // Variable declaration (block)
    if (line.startsWith("block ")) {
      const [_, varName, expression] = line.match(/block\s+(\w+)\s*=\s*(.*)/);
      this.variables[varName] = this.evaluate(expression);
      return;
    }

    // If statement (execif)
    if (line.startsWith("execif ")) {
      const conditionEnd = line.indexOf(":");
      const condition = line.slice(7, conditionEnd).trim();
      const body = line.slice(conditionEnd + 1).trim();

      if (this.evaluate(condition)) {
        this.processLine(body);  // Run the execif statement body
      } else {
        this.checkForElse();  // Check for an execelse if condition is false
      }
      return;
    }

    // While loop (mine)
    if (line.startsWith("mine ")) {
      const conditionEnd = line.indexOf(":");
      const condition = line.slice(5, conditionEnd).trim();

      const loopBody = [];
      while (!this.code[++this.currentLine].trim().startsWith("stopmine")) {
        loopBody.push(this.code[this.currentLine].trim());
      }

      // Execute the loop as long as the condition is true
      while (this.evaluate(condition)) {
        for (let loopLine of loopBody) {
          this.processLine(loopLine);
        }
      }
      return;
    }

    // Function definition (craft)
    if (line.startsWith("craft ")) {
      const funcName = line.match(/craft\s+(\w+)/)[1];
      const funcBody = [];

      // Capture all lines inside the function until "crafted"
      while (!this.code[++this.currentLine].trim().startsWith("crafted")) {
        funcBody.push(this.code[this.currentLine].trim());
      }

      this.functions[funcName] = funcBody;
      return;
    }

    // Function call
    if (line in this.functions) {
      this.runFunction(line);
      return;
    }

    throw new Error(`Unknown command: ${line}`);
  }

  checkForElse() {
    // Look ahead to check if the next line is an `execelse` command
    const nextLine = this.code[this.currentLine + 1]?.trim();

    if (nextLine && nextLine.startsWith("execelse")) {
      this.currentLine++;  // Move to execelse line
      const elseBody = nextLine.slice(8).trim();  // Everything after execelse
      if (elseBody) {
        this.processLine(elseBody);  // Process inline content if present
      }
    }
  }

  runFunction(funcName) {
    const funcBody = this.functions[funcName];
    for (let line of funcBody) this.processLine(line);
  }

  evaluate(expression) {
    expression = expression.trim();

    // Check if it's a string literal
    if (expression.startsWith('"') && expression.endsWith('"')) {
      return expression.slice(1, -1);  // Remove the quotes and return
    }

    // Check for boolean literals
    if (expression === "true") return true;
    if (expression === "false") return false;

    // Check if it's a variable
    if (this.variables.hasOwnProperty(expression)) return this.variables[expression];

    // Check if it's a numeric literal
    if (!isNaN(expression)) return Number(expression);

    // Handle comparison operators
    const comparisonOperators = ["==", "!=", "<=", ">=", "<", ">"];
    for (let op of comparisonOperators) {
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

    // Handle basic arithmetic expressions (e.g., "var + 3" or "5 * 2")
    const arithmeticOperators = ["+", "-", "*", "/"];
    for (let op of arithmeticOperators) {
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

    // If it's still unrecognized, assume it's an unknown variable or bad syntax
    throw new Error(`Unknown expression: ${expression}`);
  }
}
