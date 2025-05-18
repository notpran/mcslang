class MCSInterpreter {
    constructor(code, fileSystem = {}) {
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
    }

    run() {
        while (this.currentLine < this.code.length && !this.paused) {
            let line = this.code[this.currentLine].trim();
            this.processLine(line);
            this.currentLine++;
        }
        if (this.paused) {
            this.paused = false;
            return this.output;
        }
        return this.output.trim();
    }

    processLine(line) {
        if (line === "" || line.startsWith("::")) return;
        if (line.includes("::")) line = line.split("::")[0].trim();

        // Input handling with sign
        if (line.startsWith("sign ")) {
            const parts = line.slice(5).split("=");
            const varName = parts[0].trim();
            let prompt = parts.length > 1 ? this.evaluate(parts[1].trim()) : "Input required:";
            
            // Add the prompt to output
            this.output += prompt + "\n";
            
            // Pause execution and wait for input
            this.waiting = {
                type: "input",
                varName: varName,
                lastPrompt: prompt
            };
            this.paused = true;
            return;
        }

        // Chest (array) operations
        if (line.startsWith("chest ")) {
            const match = line.match(/chest\s+(\w+)\s*=\s*(.*)/);
            if (!match) throw new Error("Invalid chest declaration");
            const [_, varName, expression] = match;
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
            if (this.variables[varName]) throw new Error(`Cannot redeclare constant '${varName}'`);
            this.variables[varName] = this.evaluate(expression);
            this.constants.add(varName);
            return;
        }

        if (line.startsWith("block ")) {
            const [_, varName, expression] = line.match(/block\s+(\w+)\s*=\s*(.*)/);
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
            const args = match[2] ? match[2].split(" ").map(arg => arg.trim()) : [];
        
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
            const importedInterpreter = new MCSInterpreter(this.fileSystem[fileName], this.fileSystem);
            importedInterpreter.run();
            this.functions = { ...this.functions, ...importedInterpreter.functions };
            return;
        }

        const funcMatch = line.match(/^(\w+)\s*(.*)/);
        if (funcMatch && this.functions[funcMatch[1]]) {
            const [_, funcName, argStr] = funcMatch;
            const argVals = argStr ? argStr.split(",").map(v => this.evaluate(v.trim())) : [];
            this.runFunction(funcName, argVals);
            return;
        }

        throw new Error(`Unknown command: ${line}`);
    }

    runFunction(funcName, args) {
        const { body, args: paramNames } = this.functions[funcName];
    
        const prevVars = { ...this.variables };
    
        if (args.length !== paramNames.length) {
            throw new Error(`Function '${funcName}' expects ${paramNames.length} arguments, got ${args.length}`);
        }
    
        paramNames.forEach((name, index) => {
            this.variables[name] = args[index];
        });
    
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
