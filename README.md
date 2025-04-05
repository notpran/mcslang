made this cuz i was bored, thanks to chatgpt for fixing some bugs and errors tho

### ⚠️ caution! ⚠️
this language has **no real-world purpose** unless you are a minecraft fan :) (jk).
and also, this language **CANNOT BE USED FOR MINECRAFT**[for creating plugins,mods,datapacks etc etc] its just a language like python which i referenced with minecraft in javascript

# about
MCS stands for minecraft script. its a language sorta like python but its minecraft referenced!

# how to use

- Firstly Download python[optional]
- then in cmd run `pip install eel`
- then **Download the required files from this page**, extract it and run the `run.py` or go to web then run the main.html file
- if u ran the python file, a window will open up[happy scripting!]
- if you ran the html file, it would open up in your default browser[happy scripting!!] 

# How to code

### Syntax

**Statements**: Each statement or command is on **a new line**. <br>
**Whitespace**: Extra whitespace is **allowed**, but commands should generally start at **the beginning of the line**.

### Outputing text/printing - NEW!

Use the `place` command to display messages or variable values in the output area. Expressions within place can include **strings, variables/expressions, numbers, boolean values or a combination of these**.
<br>
**example**:
```
place "Hello world!" 
place 12345
place true
place 3 + 5 :: returns 8
```


### Comments

Comments start with `::` and can be placed on their **own line** or at the end of a line of code.

**example**:
```
:: dis is a print statement
place "sup" :: <---- dis one
```

### Variables

Declare variables using the `block` command. Variables can store **numbers, strings, or boolean values**.

**Syntax:**
```
block var_name = expression
```
- **var_name**: Must be a single word (letters and underscores only).
- **expression**: Can be a number(includes integer and float values), string (wrapped in double quotes), boolean, or a combination of these with arithmetic operations.

**example:**
```
block player_health = 100
block player_name = "Steve"
block is_alive = true
block exp = 9 + 10

place "hey there " + player_name
```

### Conditionals

Conditional statements use the `execif`  and `execelse` keywords. execif checks if a condition is true and executes the code after the colon. If the given condition is false, it optionally executes the execelse block.

**Syntax:**

```
execif <condition>: <statement>

:: execelse is optional
execelse <statement>
```

- **condition**: A comparison (e.g., ==, !=, <, >, <=, >=) or a boolean expression.
- **statement**: The action to execute if the condition is true or false.

**Example:**

```
block player_health = 20

execif player_health > 0: place "Player is alive!"
execelse place "Player is dead :("
```

### Loops

Loops use the `mine` keyword to start a loop and `stopmine` to end it. Loops run as long as the condition after `mine` is true.

**Syntax:**

```
mine condition:
    statements
stopmine
```

here, **condition** is a boolean expression or comparison that controls the loop.

**Example:**

```
block cobble = 0
mine cobble < 5:
    place "cobblestone count is " + cobble
    block cobble = cobble + 1
stopmine
```


### Constants - NEW!

To declare a constant variable, use the `ore` keyword.

**Syntax:**

```
ore variable_name = expression
```

here, **variable_name** is the name of the constant (letters and underscores only) and **expression** is a number, string, boolean, or arithmetic expression.

**example:**

```
ore version = "1.2"
ore gravity = 9.8
```

### Functions - NEW!!

Define functions with `craft` and end them with `crafted`. Functions allow reusable code blocks and can be called by their names after definition.

**Syntax:**

```
craft function_name arg1 arg2.... etc
    statements
crafted

function_name value1 value2..... etc
```

here, **function_name** is the name of the function, used to call it elsewhere in the code.

**Example:**

```
craft greet name
    place "Hello," + name + "!"
crafted

greet "Steve" :: Call the function
```

### Importing functions from other .mcsfiles - NEW!

You can now import and use function from other files by first, importing/creating a file and then using the `addmod` keyword to import all functions from it

**Syntax:**

```
addmod "<filename>.mcslang"
```
where, <filename> is the name of the file you are importing from

**Example:**

```
addmod "utilities.mcslang"

greet "Alex"
```
(in utilities.mcslang)
```
craft greet name
    place "Hi there, " + name
crafted
```

# Example program

**examplescript.mcslang**
```
:: Testing output and expressions
place "=== Starting MCSLang Test ==="
place "Basic math: " + (5 + 10)

:: Variables
block username = "Alex"
block score = 25
place "Player: " + username
place "Score: " + score

:: Constants
ore max_lives = 3
place "Max lives: " + max_lives

:: Reassign variable
block score = score + 10
place "New score: " + score

:: Conditional logic
execif score >= 35: place "You're doing great!"
execelse place "You need more points."

:: Loop
block count = 3
mine count > 0:
    place "Countdown: " + count
    block count = count - 1
stopmine

:: Function without args
craft intro
    place "Welcome to MCSLang world!"
crafted

intro

:: Function with args
craft greet name
    place "Hello, " + name + "!"
crafted

greet "Steve"
greet "Alex"

:: Use imported file
addmod "tools_examplescript.mcslang"

:: Call imported function
mineblocks "Diamond"
```

**tools_examplescript.mcslang:**

```
:: Example of exporting functions from another file

craft mineblocks item
    place "Mining for " + item + "..."
    block found = true
    execif found: place item + " found!"
    execelse place item + " not found :("
crafted
```
# Importing and exporting code

### exporting

simply click on the green `save file` button below the output box and choose a place to save the `.mcslang` file. this file can be opened and edited by **any** file editor

### importing

simply click on the green `import file` button below the output box and choose a compatable `.mcslang` file. whatever is in the file will be loaded into the input box where you can run or edit it!

and thats it for now! more updates coming soon


