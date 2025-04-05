class MCSInterpreter {
    constructor(code, fileSystem = {}) {
        this.code = code.split("\n");
        this.variables = {};
        this.constants = new Set();
        this.functions = {};
        this.fileSystem = fileSystem;
        this.output = "";
        this.currentLine = 0;
        this.lastExecifResult = false;
    }

    run() {
        while (this.currentLine < this.code.length) {
            let line = this.code[this.currentLine].trim();
            this.processLine(line);
            this.currentLine++;
        }
        return this.output.trim();
    }

    processLine(line) {
        if (line === "" || line.startsWith("::")) return;
        if (line.includes("::")) line = line.split("::")[0].trim();

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
    
        // Bind args into this.variables
        paramNames.forEach((name, index) => {
            this.variables[name] = args[index];
        });
    
        for (let line of body) this.processLine(line);
    
        this.variables = prevVars;
    }
    
    

    evaluate(expression) {
        expression = expression.trim();
    
        // If full expression is a simple string
        if (expression.startsWith('"') && expression.endsWith('"') && !expression.includes('+')) {
            return expression.slice(1, -1);
        }
    
        // Handle + operator for strings and numbers
        if (expression.includes("+")) {
            const parts = expression.split("+").map(part => part.trim());
            return parts.map(part => this.evaluate(part)).join("");
        }
    
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
    
        const arithmeticOps = ["-", "*", "/"];
        for (let op of arithmeticOps) {
            if (expression.includes(op)) {
                const [left, right] = expression.split(op).map(part => part.trim());
                switch (op) {
                    case "-": return this.evaluate(left) - this.evaluate(right);
                    case "*": return this.evaluate(left) * this.evaluate(right);
                    case "/": return this.evaluate(left) / this.evaluate(right);
                }
            }
        }
    
        throw new Error(`Unknown expression: ${expression}`);
    }
}
