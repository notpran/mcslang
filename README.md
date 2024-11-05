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
- if you ran the html file, it would open up in your default browser[happy coding!!] 

# How to code

### Syntax

**Statements**: Each statement or command is on **a new line**. <br>
**Whitespace**: Extra whitespace is **allowed**, but commands should generally start at **the beginning of the line**.

### Outputing text/printing

Use the `place` command to display messages or variable values in the output area. Expressions within place can include **strings, variables/expressions, numbers, boolean values or a combination of these**.
<br>
**example**:
```
place "Hello world!" 
place 12345
place true
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

Conditional statements use the `execif`  keywords. execif checks if a condition is true and executes the code after the colon.(btw the else statement is coming soon)

**Syntax:**

```
execif <condition>: <statement>
```

- **condition**: A comparison (e.g., ==, !=, <, >, <=, >=) or a boolean expression.
- **statement**: The action to execute if the condition is true or false.

**Example:**

```
block player_health = 20

execif player_health > 0: place "Player is alive!"
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

### Functions

Define functions with `craft` and end them with `crafted`. Functions allow reusable code blocks and can be called by their names after definition.

**Syntax:**

```
craft function_name
    statements
crafted
```

here, **function_name** is the name of the function, used to call it elsewhere in the code.

**Example:**

```
craft greet
    place "Hello, Adventurer!"
crafted

greet  :: Call the function
```

# Example program

```
block health = 50
place "Initial player health: " + health

block is_night = true
execif is_night: place "It's nighttime. Stay alert!"

:: Simulate health draining loop
place "Entering a battle..."
mine health > 0:
  place "Player is fighting... Health: " + health
  block health = health - 15
stopmine

:: Define a heal function
craft heal
  block health = health + 30
crafted

:: Use the heal function
place "After battle, healing..."
heal
place "Player's health after healing: " + health

:: Another variable and condition example
block has_shield = false
execif has_shield: place "Player has a shield for extra protection."
```
and thats it! more updates coming soon


