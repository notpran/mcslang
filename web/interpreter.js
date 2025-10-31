class MCSInterpreter {

    constructor(code, fileSystem = {}, options = {}) {
        this.code = code ? code.split("\n") : [];
        this.variables = {};
        this.constants = new Set();
        this.functions = {};
        this.fileSystem = fileSystem || {};
        this.output = "";
        this.currentLine = 0;
        this.lastExecifResult = false;
        this.waiting = null;
        this.paused = false;
        this.traceEnabled = !!options.trace;
    }

    trace(msg) {
        if (this.traceEnabled) {
            // Append to output so the UI can show it
            this.output += `TRACE: ${msg}\n`;
        }
    }


    run() {
        try {
            this.trace(`run() enter; currentLine=${this.currentLine}`);
            while (this.currentLine < this.code.length) {
                let line = (this.code[this.currentLine] || "").trim();
                this.trace(`line ${this.currentLine}: ${line}`);
                this.processLine(line);
                // If processLine set paused (dialog or input), return now and let the UI handle resume
                if (this.paused) {
                    this.trace(`paused at line ${this.currentLine}; waiting=${JSON.stringify(this.waiting)}`);
                    return this.output.trim();
                }
                this.currentLine++;
            }
            this.trace(`run() finished; currentLine=${this.currentLine}`);
            return this.output.trim();
        } catch (e) {
            this.output = `Error: ${e.message}`;
            return this.output;
        }
    }

    processLine(line) {

        if (line === "" || line.startsWith("::")) return;
        if (line.includes("::")) line = line.split("::")[0].trim();

        // Dialog block definition
        if (line.startsWith("dialog ")) {
            const match = line.match(/dialog\s+(\w+)\s*\(\)\s*:/);
            if (!match) throw new Error("Invalid dialog declaration. Use: dialog name():");
            const dialogName = match[1];
            // Name conflict check
            if ((this.functions && this.functions[dialogName]) || (this.variables && this.variables.hasOwnProperty(dialogName)) || (this.constants && this.constants.has(dialogName)) || (this.dialogs && this.dialogs[dialogName])) {
                throw new Error(`NameError: '${dialogName}' already used as a function, variable, constant, or dialog`);
            }
            let dialogRows = [];
            // Parse dialog block
            const dialogBody = [];
            let foundElog = false;
            let dialogLineIdx = this.currentLine + 1;
            while (dialogLineIdx < this.code.length) {
                const dialogLine = this.code[dialogLineIdx].trim();
                if (dialogLine.startsWith("elog;")) {
                    foundElog = true;
                    break;
                }
                dialogBody.push(dialogLine);
                dialogLineIdx++;
            }
            if (!foundElog) throw new Error("Syntax error: missing 'elog;' after dialog block");
            this.trace(`defined dialog '${dialogName}' lines ${this.currentLine + 1}-${dialogLineIdx - 1}`);
            this.currentLine = dialogLineIdx + 1; // skip elog; line
            for (let dialogLine of dialogBody) {
                // Each dialog line is a row; collect all statements on the line
                const statements = dialogLine.split(';').map(s => s.trim()).filter(Boolean);
                if (statements.length === 0) continue;
                const row = [];
                for (let stmt of statements) {
                    // Support: text "..." (new), text('...') (old)
                    if (stmt.startsWith("text ")) {
                        const textMatch = stmt.match(/^text\s+"([^"]+)"$/);
                        if (textMatch) { row.push({ type: 'text', value: textMatch[1] }); continue; }
                    }
                    if (stmt.startsWith("text(")) {
                        const textMatch = stmt.match(/text\(["'](.+)["']\)/);
                        if (textMatch) { row.push({ type: 'text', value: textMatch[1] }); continue; }
                    }
                    // Support: button "...", "..." (new), button["...", ...] (old)
                    if (stmt.startsWith("button ")) {
                        const btnMatch = stmt.match(/^button\s+(("[^"]+"\s*,?\s*)+)$/);
                        if (btnMatch) {
                            const btns = btnMatch[1].split(',').map(b => b.trim().replace(/^"|"$/g, "")).filter(Boolean);
                            row.push({ type: 'button', value: btns });
                            continue;
                        }
                    }
                    if (stmt.startsWith("button[")) {
                        const btnMatch = stmt.match(/button\[(.*)\]/);
                        if (btnMatch) {
                            const btns = btnMatch[1].split(',').map(b => b.trim().replace(/^"|"$/g, "")).filter(Boolean);
                            row.push({ type: 'button', value: btns });
                            continue;
                        }
                    }
                }
                if (row.length > 0) dialogRows.push(row);
            }
            if (!this.dialogs) this.dialogs = {};
            this.dialogs[dialogName] = { rows: dialogRows };
            this.trace(`dialog '${dialogName}' parsed: ${JSON.stringify(dialogRows)}`);
            return;
        }

        // Dialog invocation
        const dialogCallMatch = line.match(/^(\w+)\(\);?$/);
        if (dialogCallMatch && this.dialogs && this.dialogs[dialogCallMatch[1]]) {
            const dialogName = dialogCallMatch[1];
            // Name conflict check: dialog and function
            if (this.functions && this.functions[dialogName]) {
                throw new Error(`NameError: '${dialogName}' is both a dialog and a function`);
            }
            const rows = this.dialogs[dialogName].rows || [];
            // ALL dialogs are non-blocking for now (don't pause execution)
            this.waiting = {
                type: "dialog",
                rows: rows,
                requiresResponse: false
            };
            this.trace(`invoked non-blocking dialog '${dialogName}'`);
            return;
        }

        // Single command keyword handling
        const trimmed = line.trim();
        if (["place", "sign", "block", "ore", "chest", "store", "take", "execif", "execelse", "mine", "stopmine", "craft", "crafted", "addmod", "dialog"].includes(trimmed)) {
            if (trimmed === "place") return; // do nothing for only 'place'
            throw new Error(`Syntax error: incomplete or invalid usage of '${trimmed}'`);
        }

        // Input handling with sign
        if (line.startsWith("sign ")) {
            const parts = line.slice(5).split("=");
            const varName = parts[0].trim();
            let prompt = parts.length > 1 ? this.evaluate(parts[1].trim()) : "Input required:";
            
            // Add the prompt to output
            this.output += prompt + "\n";

            this.trace(`sign input requested for '${varName}' with prompt '${prompt}'; advanced currentLine to ${this.currentLine + 1}`);
            
            // Pause execution and wait for input
            this.waiting = {
                type: "input",
                varName: varName,
                lastPrompt: prompt
            };
            this.paused = true;
            // advance currentLine so sign statement isn't re-run after input is provided
            this.currentLine++;
            return;
        }

        // Chest (array) operations
        if (line.startsWith("chest ")) {
            const match = line.match(/chest\s+(\w+)\s*=\s*(.*)/);
            if (!match) throw new Error("Invalid chest declaration");
            const [_, varName, expression] = match;
            // Name conflict check
            if ((this.functions && this.functions[varName]) || (this.dialogs && this.dialogs[varName]) || (this.constants && this.constants.has(varName)) || (this.variables && this.variables.hasOwnProperty(varName))) {
                throw new Error(`NameError: '${varName}' already used as a function, dialog, constant, or variable`);
            }
            if (this.constants.has(varName)) throw new Error(`Cannot modify constant '${varName}'`);
            const value = this.evaluate(expression);
            if (!Array.isArray(value)) throw new Error("Chest must be initialized with an array");
            this.variables[varName] = value;
            return;
        }

        // Add to chest (push to array)
        if (line.startsWith("store ")) {
            const match = line.match(/store\s+(\w+)\s+(.*)/);
            if (!match) throw new Error("Invalid store command");
            const [_, chestName, itemExpr] = match;
            if (!this.variables.hasOwnProperty(chestName)) throw new Error(`Chest '${chestName}' does not exist`);
            if (!Array.isArray(this.variables[chestName])) throw new Error(`'${chestName}' is not a chest`);
            const item = this.evaluate(itemExpr);
            this.variables[chestName].push(item);
            return;
        }

        // Remove from chest (pop from array)
        if (line.startsWith("take ")) {
            const match = line.match(/take\s+(\w+)(?:\s+(.+))?/);
            if (!match) throw new Error("Invalid take command");
            const [_, chestName, itemExpr] = match;
            
            if (!Array.isArray(this.variables[chestName])) 
                throw new Error(`${chestName} is not a chest`);
            
            // If no specific item is specified, pop the last item
            if (!itemExpr) {
                return this.variables[chestName].pop();
            }
            
            // Remove specific item
            const itemToRemove = this.evaluate(itemExpr.trim());
            const index = this.variables[chestName].findIndex(item => item === itemToRemove);
            if (index === -1) throw new Error(`Item ${itemToRemove} not found in chest ${chestName}`);
            return this.variables[chestName].splice(index, 1)[0];
        }

        if (line.startsWith("place ")) {
            this.output += this.evaluate(line.slice(6)) + "\n";
            return;
        }

        if (line.startsWith("ore ")) {
            const [_, varName, expression] = line.match(/ore\s+(\w+)\s*=\s*(.*)/);
            // Name conflict check
            if ((this.functions && this.functions[varName]) || (this.dialogs && this.dialogs[varName]) || (this.variables && this.variables.hasOwnProperty(varName)) || (this.constants && this.constants.has(varName))) {
                throw new Error(`NameError: '${varName}' already used as a function, dialog, variable, or constant`);
            }
            if (this.variables[varName]) throw new Error(`Cannot redeclare constant '${varName}'`);
            this.variables[varName] = this.evaluate(expression);
            this.constants.add(varName);
            return;
        }

        if (line.startsWith("block ")) {
            const [_, varName, expression] = line.match(/block\s+(\w+)\s*=\s*(.*)/);
            // Name conflict check
            if ((this.functions && this.functions[varName]) || (this.dialogs && this.dialogs[varName]) || (this.constants && this.constants.has(varName)) || (this.variables && this.variables.hasOwnProperty(varName))) {
                throw new Error(`NameError: '${varName}' already used as a function, dialog, constant, or variable`);
            }
            if (this.constants.has(varName)) throw new Error(`Cannot modify constant '${varName}'`);
            this.variables[varName] = this.evaluate(expression);
            return;
        }

        if (line.startsWith("execif ")) {
            const [_, condition, action] = line.match(/execif\s+(.*):\s*(.*)/);
            if (this.evaluate(condition)) {
                this.lastExecifResult = true;
                this.processLine(action);
            } else {
                this.lastExecifResult = false;
            }
            return;
        }

        if (line.startsWith("execelse")) {
            if (!this.lastExecifResult) {
                const elseAction = line.replace("execelse", "").trim();
                if (elseAction) this.processLine(elseAction);
                else {
                    const nextLine = this.code[++this.currentLine]?.trim();
                    if (nextLine) this.processLine(nextLine);
                }
            }
            return;
        }

        if (line.startsWith("mine ")) {
            const condition = line.slice(5, line.indexOf(":")).trim();
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
            const match = line.match(/craft\s+(\w+)\s*(.*)/);
            const funcName = match[1];
            const args = match[2] ? match[2].split(" ").map(arg => arg.trim()).filter(Boolean) : [];
            // Name conflict check
            if ((this.dialogs && this.dialogs[funcName]) || (this.variables && this.variables.hasOwnProperty(funcName)) || (this.constants && this.constants.has(funcName)) || (this.functions && this.functions[funcName])) {
                throw new Error(`NameError: '${funcName}' already used as a dialog, variable, constant, or function`);
            }
            const funcBody = [];
            while (!this.code[++this.currentLine].trim().startsWith("crafted")) {
                funcBody.push(this.code[this.currentLine].trim());
            }
            this.functions[funcName] = { body: funcBody, args };
            return;
        }
        

        if (line.startsWith("addmod ")) {
            const fileName = line.match(/addmod\s+"(.+?)"/)?.[1];
            if (!fileName) throw new Error("Invalid addmod path");
            if (!this.fileSystem[fileName]) throw new Error(`File '${fileName}' not found.`);
            // Create imported interpreter without tracing
            const importedInterpreter = new MCSInterpreter(this.fileSystem[fileName], this.fileSystem, { trace: false });
            importedInterpreter.run();
            this.functions = { ...this.functions, ...importedInterpreter.functions };
            return;
        }

        const funcMatch = line.match(/^(\w+)\s*(.*)/);
        if (funcMatch && this.functions[funcMatch[1]]) {
            const [_, funcName, argStr] = funcMatch;
            // Name conflict check: function and dialog
            if (this.dialogs && this.dialogs[funcName]) {
                throw new Error(`NameError: '${funcName}' is both a function and a dialog`);
            }
            let argVals = [];
            if (argStr && argStr.trim() !== "") {
                argVals = argStr.split(",").map(v => this.evaluate(v.trim()));
            }
            this.runFunction(funcName, argVals);
            return;
        }

        throw new Error(`Unknown command: ${line}`);
    }

    runFunction(funcName, args) {
        const { body, args: paramNames } = this.functions[funcName];
        const prevVars = { ...this.variables };
        // Allow missing arguments (set to void)
        for (let i = 0; i < paramNames.length; i++) {
            this.variables[paramNames[i]] = (args && args.length > i) ? args[i] : null;
        }
        for (let line of body) this.processLine(line);
        this.variables = prevVars;
    }
    
    validateAndStoreInput(varName, input) {
        // Store input as is, no validation
        this.variables[varName] = input;
        return true;
    }

    evaluate(expression) {
        if (!expression) return null;
        expression = expression.trim();
    
        if (expression === "void" || expression === "")
            return null;

        // Handle parentheses first
        if (expression.includes('(')) {
            const openIndex = expression.indexOf('(');
            const closeIndex = expression.lastIndexOf(')');
            if (closeIndex === -1) throw new Error("Missing closing parenthesis");
            
            // Evaluate inner expression first
            const innerExpr = expression.substring(openIndex + 1, closeIndex);
            const innerResult = this.evaluate(innerExpr);
            
            // Replace the parenthesized expression with its result
            expression = expression.substring(0, openIndex) + innerResult + expression.substring(closeIndex + 1);
            return this.evaluate(expression);
        }
        
        // Array/chest operations
        if (!expression) return null;
        if (expression.startsWith("[") && expression.endsWith("]")) {
            if (expression === "[]") return [];
            const items = expression.slice(1, -1).split(",")
                .filter(item => item && item.trim() !== "")
                .map(item => this.evaluate(item.trim()))
                .filter(item => item !== undefined && item !== null);
            return items;
        }

        // Array access
        if (expression.includes("[") && expression.endsWith("]")) {
            const [arrayName, indexExpr] = expression.split("[");
            const array = this.evaluate(arrayName);
            if (!Array.isArray(array)) throw new Error("Not a chest: " + arrayName);
            const index = this.evaluate(indexExpr.slice(0, -1));
            if (index < 0 || index >= array.length) throw new Error("Index out of bounds");
            return array[index];
        }

        // String operations
        if (expression.startsWith('"') && expression.endsWith('"')) {
            return expression.slice(1, -1);
        }
    
        // String methods
        if (expression.includes(".length")) {
            const strExpr = expression.split(".length")[0];
            const str = this.evaluate(strExpr);
            return typeof str === "string" ? str.length : (Array.isArray(str) ? str.length : 0);
        }

        if (expression.includes("+")) {
            const parts = expression.split("+").map(part => this.evaluate(part.trim()));
            return parts.reduce((a, b) => a + b);
        }
    
        if (expression === "true")
            return true;
        if (expression === "false")
            return false;
        if (expression === "void")
            return null;
        if (this.variables.hasOwnProperty(expression))
            return this.variables[expression];
        if (!isNaN(expression))
            return Number(expression);

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
    
        const arithmeticOps = ["-", "*", "/"];
        for (let op of arithmeticOps) {
            const parts = expression.split(op);
            if (parts.length > 1) {
                const left = this.evaluate(parts[0].trim());
                const right = this.evaluate(parts.slice(1).join(op).trim());
                if (typeof left !== 'number' || typeof right !== 'number') {
                    throw new Error(`Arithmetic operations require numbers`);
                }
                switch (op) {
                    case "-": return left - right;
                    case "*": return left * right;
                    case "/": return left / right;
                }
            }
        }
    
        throw new Error(`Unknown expression: ${expression}`);
    }
}
