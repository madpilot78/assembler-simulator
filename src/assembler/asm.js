app.service('assembler', ['opcodes', function (opcodes) {
    return {
        go: function (input) {
            // Use https://www.debuggex.com/
            // Matches: "label: INSTRUCTION (["')OPERAND1(]"'), (["')OPERAND2(]"')
            // GROUPS:      1       2               3                    7
            var regex = /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,4})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?)?/;

            // Regex group indexes for operands
            var op1_group = 3;
            var op2_group = 7;

            // MATCHES: "(+|-)INTEGER"
            var regexNum = /^[-+]?[0-9]+$/;
            // MATCHES: "(.L)abel"
            var regexLabel = /^[.A-Za-z]\w*$/;
            // Contains the program code & data generated by the assembler
            var code = [];
            // Contains the mapping from instructions to assembler line
            var mapping = {};
            // Hash map of label used to replace the labels after the assembler generated the code
            var labels = {};
            // Hash of uppercase labels used to detect duplicates
            var normalizedLabels = {};

            // Split text into code lines
            var lines = input.split('\n');

            // Allowed formats: 200, 200d, 0xA4, 0o48, 101b
            var parseNumber = function (input) {
                if (input.slice(0, 2) === "0x") {
                    return parseInt(input.slice(2), 16);
                } else if (input.slice(0, 2) === "0o") {
                    return parseInt(input.slice(2), 8);
                } else if (input.slice(input.length - 1) === "b") {
                    return parseInt(input.slice(0, input.length - 1), 2);
                } else if (input.slice(input.length - 1) === "d") {
                    return parseInt(input.slice(0, input.length - 1), 10);
                } else if (regexNum.exec(input)) {
                    return parseInt(input, 10);
                } else {
                    throw "Invalid number format";
                }
            };

            // Allowed registers: A, B, C, D, SP
            var parseRegister = function (input) {
                input = input.toUpperCase();

                if (input === 'A') {
                    return 0;
                } else if (input === 'B') {
                    return 1;
                } else if (input === 'C') {
                    return 2;
                } else if (input === 'D') {
                    return 3;
                } else if (input === 'SP') {
                    return 4;
                } else {
                    return undefined;
                }
            };

            var parseOffsetAddressing = function (input) {
                input = input.toUpperCase();
                var m = 0;
                var base = 0;

                if (input[0] === 'A') {
                    base = 0;
                } else if (input[0] === 'B') {
                    base = 1;
                } else if (input[0] === 'C') {
                    base = 2;
                } else if (input[0] === 'D') {
                    base = 3;
                } else if (input.slice(0, 2) === "SP") {
                    base = 4;
                } else {
                    return undefined;
                }
                var offset_start = 1;
                if (base === 4) {
                    offset_start = 2;
                }

                if (input[offset_start] === '-') {
                    m = -1;
                } else if (input[offset_start] === '+') {
                    m = 1;
                } else {
                    return undefined;
                }

                var offset = m * parseInt(input.slice(offset_start + 1), 10);

                if (offset < -16 || offset > 15)
                    throw "offset must be a value between -16...+15";

                if (offset < 0) {
                    offset = 32 + offset; // two's complement representation in 5-bit
                }

                return offset * 8 + base; // shift offset 3 bits right and add code for register
            };

            // Allowed: Register, Label or Number; SP+/-Number is allowed for 'regaddress' type
            var parseRegOrNumber = function (input, typeReg, typeNumber) {
                var register = parseRegister(input);

                if (register !== undefined) {
                    return {type: typeReg, value: register};
                } else {
                    var label = parseLabel(input);
                    if (label !== undefined) {
                        return {type: typeNumber, value: label};
                    } else {
                        if (typeReg === "regaddress") {

                            register = parseOffsetAddressing(input);

                            if (register !== undefined) {
                                return {type: typeReg, value: register};
                            }
                        }

                        var value = parseNumber(input);

                        if (isNaN(value)) {
                            throw "Not a " + typeNumber + ": " + value;
                        }
                        else if (value < 0 || value > 255)
                            throw typeNumber + " must have a value between 0-255";

                        return {type: typeNumber, value: value};
                    }
                }
            };

            var parseLabel = function (input) {
                return regexLabel.exec(input) ? input : undefined;
            };

            var getValue = function (input) {
                switch (input.slice(0, 1)) {
                    case '[': // [number] or [register]
                        var address = input.slice(1, input.length - 1);
                        return parseRegOrNumber(address, "regaddress", "address");
                    case '"': // "String"
                        var text = input.slice(1, input.length - 1);
                        var chars = [];

                        for (var i = 0, l = text.length; i < l; i++) {
                            chars.push(text.charCodeAt(i));
                        }

                        return {type: "numbers", value: chars};
                    case "'": // 'C'
                        var character = input.slice(1, input.length - 1);
                        if (character.length > 1)
                            throw "Only one character is allowed. Use String instead";

                        return {type: "number", value: character.charCodeAt(0)};
                    default: // REGISTER, NUMBER or LABEL
                        return parseRegOrNumber(input, "register", "number");
                }
            };

            var addLabel = function (label) {
                var upperLabel = label.toUpperCase();
                if (upperLabel in normalizedLabels)
                    throw "Duplicate label: " + label;

                if (upperLabel === "A" || upperLabel === "B" || upperLabel === "C" || upperLabel === "D")
                    throw "Label contains keyword: " + upperLabel;

                labels[label] = code.length;
            };

            var checkNoExtraArg = function (instr, arg) {
                if (arg !== undefined) {
                    throw instr + ": too many arguments";
                }
            };

            var opcodeOffset = function (base, reg) {
                if (reg > 4)
                    throw "Invalid register";

                return base + reg;
            };

            for (var i = 0, l = lines.length; i < l; i++) {
                try {
                    var match = regex.exec(lines[i]);
                    if (match[1] !== undefined || match[2] !== undefined) {
                        if (match[1] !== undefined) {
                            addLabel(match[1]);
                        }

                        if (match[2] !== undefined) {
                            var instr = match[2].toUpperCase();
                            var p1, p2, opCode;

                            // Add mapping instr pos to line number
                            // Don't do it for DB as this is not a real instruction
                            if (instr !== 'DB') {
                                mapping[code.length] = i;
                            }

                            switch (instr) {
                                case 'DB':
                                    p1 = getValue(match[op1_group]);

                                    if (p1.type === "number")
                                        code.push(p1.value);
                                    else if (p1.type === "numbers")
                                        for (var j = 0, k = p1.value.length; j < k; j++) {
                                            code.push(p1.value[j]);
                                        }
                                    else
                                        throw "DB does not support this operand";

                                    break;
                                case 'HLT':
                                    checkNoExtraArg('HLT', match[op1_group]);
                                    opCode = opcodes.NONE;
                                    code.push(opCode);
                                    break;

                                case 'MOV':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodeOffset(opcodes.MOV_REG_TO_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodeOffset(opcodes.MOV_ADDRESS_TO_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodeOffset(opcodes.MOV_REGADDRESS_TO_REG_A, p1.value);
                                    else if (p1.type === "address" && p2.type === "register")
                                        opCode = opcodeOffset(opcodes.MOV_REG_TO_ADDRESS_A, p2.value);
                                    else if (p1.type === "regaddress" && p2.type === "register")
                                        opCode = opcodeOffset(opcodes.MOV_REG_TO_REGADDRESS_A, p2.value);
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodeOffset(opcodes.MOV_NUMBER_TO_REG_A, p1.value);
                                    else if (p1.type === "address" && p2.type === "number")
                                        opCode = opcodes.MOV_NUMBER_TO_ADDRESS;
                                    else if (p1.type === "regaddress" && p2.type === "number")
                                        opCode = opcodes.MOV_NUMBER_TO_REGADDRESS;
                                    else
                                        throw "MOV does not support this operands";

                                    if (p1.type === "register") {
                                        code.push(opCode, p2.value);
                                    } else if (p2.type === "register") {
                                        code.push(opCode, p1.value);
                                    } else {
                                        code.push(opCode, p1.value, p2.value);
                                    }
                                    break;
                                case 'ADD':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodeOffset(opcodes.ADD_REG_TO_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodeOffset(opcodes.ADD_REGADDRESS_TO_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodeOffset(opcodes.ADD_ADDRESS_TO_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodeOffset(opcodes.ADD_NUMBER_TO_REG_A, p1.value);
                                    else
                                        throw "ADD does not support this operands";

                                    code.push(opCode, p2.value);
                                    break;
                                case 'SUB':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodeOffset(opcodes.SUB_REG_FROM_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodeOffset(opcodes.SUB_REGADDRESS_FROM_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodeOffset(opcodes.SUB_ADDRESS_FROM_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodeOffset(opcodes.SUB_NUMBER_FROM_REG_A, p1.value);
                                    else
                                        throw "SUB does not support this operands";

                                    code.push(opCode, p2.value);
                                    break;
                                case 'INC':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg('INC', match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodeOffset(opcodes.INC_REG_A, p1.value);
                                    else
                                        throw "INC does not support this operand";

                                    code.push(opCode);

                                    break;
                                case 'DEC':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg('DEC', match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodeOffset(opcodes.DEC_REG_A, p1.value);
                                    else
                                        throw "DEC does not support this operand";

                                    code.push(opCode);

                                    break;
                                case 'CMP':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodeOffset(opcodes.CMP_REG_WITH_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodeOffset(opcodes.CMP_REGADDRESS_WITH_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodeOffset(opcodes.CMP_ADDRESS_WITH_REG_A, p1.value);
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodeOffset(opcodes.CMP_NUMBER_WITH_REG_A, p1.value);
                                    else
                                        throw "CMP does not support this operands";

                                    code.push(opCode, p2.value);
                                    break;
                                case 'JMP':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg('JMP', match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.JMP_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.JMP_ADDRESS;
                                    else
                                        throw "JMP does not support this operands";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'JC':
                                case 'JB':
                                case 'JNAE':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.JC_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.JC_ADDRESS;
                                    else
                                        throw instr + " does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'JNC':
                                case 'JNB':
                                case 'JAE':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.JNC_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.JNC_ADDRESS;
                                    else
                                        throw instr + "does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'JZ':
                                case 'JE':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.JZ_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.JZ_ADDRESS;
                                    else
                                        throw instr + " does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'JNZ':
                                case 'JNE':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.JNZ_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.JNZ_ADDRESS;
                                    else
                                        throw instr + " does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'JA':
                                case 'JNBE':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.JA_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.JA_ADDRESS;
                                    else
                                        throw instr + " does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'JNA':
                                case 'JBE':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.JNA_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.JNA_ADDRESS;
                                    else
                                        throw instr + " does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'PUSH':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodeOffset(opcodes.PUSH_REG_A, p1.value);
                                    else if (p1.type === "regaddress")
                                        opCode = opcodes.PUSH_REGADDRESS;
                                    else if (p1.type === "address")
                                        opCode = opcodes.PUSH_ADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.PUSH_NUMBER;
                                    else
                                        throw "PUSH does not support this operand";

                                    if (p1.type === "register") {
                                        code.push(opCode);
                                    } else {
                                        code.push(opCode, p1.value);
                                    }
                                    break;
                                case 'POP':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodeOffset(opcodes.POP_REG_A, p1.value);
                                    else
                                        throw "PUSH does not support this operand";

                                    if (p1.type === "register") {
                                        code.push(opCode);
                                    } else {
                                        code.push(opCode, p1.value);
                                    }
                                    break;
                                case 'CALL':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.CALL_REGADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.CALL_ADDRESS;
                                    else
                                        throw "CALL does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'RET':
                                    checkNoExtraArg(instr, match[op1_group]);

                                    opCode = opcodes.RET;

                                    code.push(opCode);
                                    break;

                                case 'MUL':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodeOffset(opcodes.MUL_REG_A, p1.value);
                                    else if (p1.type === "regaddress")
                                        opCode = opcodes.MUL_REGADDRESS;
                                    else if (p1.type === "address")
                                        opCode = opcodes.MUL_ADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.MUL_NUMBER;
                                    else
                                        throw "MULL does not support this operand";

                                    code.push(opCode);
                                    if (p1.type !== "register")
                                        code.push(p1.value);
                                    break;
                                case 'DIV':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodeOffset(opcodes.DIV_REG_A, p1.value);
                                    else if (p1.type === "regaddress")
                                        opCode = opcodes.DIV_REGADDRESS;
                                    else if (p1.type === "address")
                                        opCode = opcodes.DIV_ADDRESS;
                                    else if (p1.type === "number")
                                        opCode = opcodes.DIV_NUMBER;
                                    else
                                        throw "DIV does not support this operand";

                                    code.push(opCode);
                                    if (p1.type !== "register")
                                        code.push(p1.value);
                                    break;
                                case 'AND':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodes.AND_REG_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodes.AND_REGADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodes.AND_ADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodes.AND_NUMBER_WITH_REG;
                                    else
                                        throw "AND does not support this operands";

                                    code.push(opCode, p1.value, p2.value);
                                    break;
                                case 'OR':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodes.OR_REG_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodes.OR_REGADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodes.OR_ADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodes.OR_NUMBER_WITH_REG;
                                    else
                                        throw "OR does not support this operands";

                                    code.push(opCode, p1.value, p2.value);
                                    break;
                                case 'XOR':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodes.XOR_REG_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodes.XOR_REGADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodes.XOR_ADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodes.XOR_NUMBER_WITH_REG;
                                    else
                                        throw "XOR does not support this operands";

                                    code.push(opCode, p1.value, p2.value);
                                    break;
                                case 'NOT':
                                    p1 = getValue(match[op1_group]);
                                    checkNoExtraArg(instr, match[op2_group]);

                                    if (p1.type === "register")
                                        opCode = opcodes.NOT_REG;
                                    else
                                        throw "NOT does not support this operand";

                                    code.push(opCode, p1.value);
                                    break;
                                case 'SHL':
                                case 'SAL':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodes.SHL_REG_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodes.SHL_REGADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodes.SHL_ADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodes.SHL_NUMBER_WITH_REG;
                                    else
                                        throw instr + " does not support this operands";

                                    code.push(opCode, p1.value, p2.value);
                                    break;
                                case 'SHR':
                                case 'SAR':
                                    p1 = getValue(match[op1_group]);
                                    p2 = getValue(match[op2_group]);

                                    if (p1.type === "register" && p2.type === "register")
                                        opCode = opcodes.SHR_REG_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "regaddress")
                                        opCode = opcodes.SHR_REGADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "address")
                                        opCode = opcodes.SHR_ADDRESS_WITH_REG;
                                    else if (p1.type === "register" && p2.type === "number")
                                        opCode = opcodes.SHR_NUMBER_WITH_REG;
                                    else
                                        throw instr + " does not support this operands";

                                    code.push(opCode, p1.value, p2.value);
                                    break;
                                default:
                                    throw "Invalid instruction: " + match[2];
                            }
                        }
                    } else {
                        // Check if line starts with a comment otherwise the line contains an error and can not be parsed
                        var line = lines[i].trim();
                        if (line !== "" && line.slice(0, 1) !== ";") {
                            throw "Syntax error";
                        }
                    }
                } catch (e) {
                    throw {error: e, line: i};
                }
            }

            // Replace label
            for (i = 0, l = code.length; i < l; i++) {
                if (!angular.isNumber(code[i])) {
                    if (code[i] in labels) {
                        code[i] = labels[code[i]];
                    } else {

                        throw {error: "Undefined label: " + code[i]};
                    }
                }
            }

            return {code: code, mapping: mapping, labels: labels};
        }
    };
}]);
