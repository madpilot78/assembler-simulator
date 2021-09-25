app.service('opcodes', [function() {
    var opcodes = {
        NONE: 0,
        MOV_REG_TO_REG_A: 1,
        MOV_REG_TO_REG_B: 2,
        MOV_REG_TO_REG_C: 3,
        MOV_REG_TO_REG_D: 4,
        MOV_REG_TO_REG_SP: 5,
        MOV_ADDRESS_TO_REG_A: 6,
        MOV_ADDRESS_TO_REG_B: 7,
        MOV_ADDRESS_TO_REG_C: 8,
        MOV_ADDRESS_TO_REG_D: 9,
        MOV_ADDRESS_TO_REG_SP: 10,
        MOV_REGADDRESS_TO_REG_A: 11,
        MOV_REGADDRESS_TO_REG_B: 12,
        MOV_REGADDRESS_TO_REG_C: 13,
        MOV_REGADDRESS_TO_REG_D: 14,
        MOV_REGADDRESS_TO_REG_SP: 15,
        MOV_REG_TO_ADDRESS_A: 16,
        MOV_REG_TO_ADDRESS_B: 17,
        MOV_REG_TO_ADDRESS_C: 18,
        MOV_REG_TO_ADDRESS_D: 19,
        MOV_REG_TO_ADDRESS_SP: 20,
        MOV_REG_TO_REGADDRESS_A: 21,
        MOV_REG_TO_REGADDRESS_B: 22,
        MOV_REG_TO_REGADDRESS_C: 23,
        MOV_REG_TO_REGADDRESS_D: 24,
        MOV_REG_TO_REGADDRESS_SP: 25,
        MOV_NUMBER_TO_REG_A: 26,
        MOV_NUMBER_TO_REG_B: 27,
        MOV_NUMBER_TO_REG_C: 28,
        MOV_NUMBER_TO_REG_D: 29,
        MOV_NUMBER_TO_REG_SP: 30,
        MOV_NUMBER_TO_ADDRESS: 31,
        MOV_NUMBER_TO_REGADDRESS: 32,
        ADD_REG_TO_REG_A: 33,
        ADD_REG_TO_REG_B: 34,
        ADD_REG_TO_REG_C: 35,
        ADD_REG_TO_REG_D: 36,
        ADD_REG_TO_REG_SP: 37,
        ADD_REGADDRESS_TO_REG_A: 38,
        ADD_REGADDRESS_TO_REG_B: 39,
        ADD_REGADDRESS_TO_REG_C: 40,
        ADD_REGADDRESS_TO_REG_D: 41,
        ADD_REGADDRESS_TO_REG_SP: 42,
        ADD_ADDRESS_TO_REG_A: 43,
        ADD_ADDRESS_TO_REG_B: 44,
        ADD_ADDRESS_TO_REG_C: 45,
        ADD_ADDRESS_TO_REG_D: 46,
        ADD_ADDRESS_TO_REG_SP: 47,
        ADD_NUMBER_TO_REG_A: 48,
        ADD_NUMBER_TO_REG_B: 49,
        ADD_NUMBER_TO_REG_C: 50,
        ADD_NUMBER_TO_REG_D: 51,
        ADD_NUMBER_TO_REG_SP: 52,
        SUB_REG_FROM_REG_A: 53,
        SUB_REG_FROM_REG_B: 54,
        SUB_REG_FROM_REG_C: 55,
        SUB_REG_FROM_REG_D: 56,
        SUB_REG_FROM_REG_SP: 57,
        SUB_REGADDRESS_FROM_REG_A: 58,
        SUB_REGADDRESS_FROM_REG_B: 59,
        SUB_REGADDRESS_FROM_REG_C: 60,
        SUB_REGADDRESS_FROM_REG_D: 61,
        SUB_REGADDRESS_FROM_REG_SP: 62,
        SUB_ADDRESS_FROM_REG_A: 63,
        SUB_ADDRESS_FROM_REG_B: 64,
        SUB_ADDRESS_FROM_REG_C: 65,
        SUB_ADDRESS_FROM_REG_D: 66,
        SUB_ADDRESS_FROM_REG_SP: 67,
        SUB_NUMBER_FROM_REG_A: 68,
        SUB_NUMBER_FROM_REG_B: 69,
        SUB_NUMBER_FROM_REG_C: 70,
        SUB_NUMBER_FROM_REG_D: 71,
        SUB_NUMBER_FROM_REG_SP: 72,
        INC_REG_A: 73,
        INC_REG_B: 74,
        INC_REG_C: 75,
        INC_REG_D: 76,
        INC_REG_SP: 77,
        DEC_REG_A: 78,
        DEC_REG_B: 79,
        DEC_REG_C: 80,
        DEC_REG_D: 81,
        DEC_REG_SP: 82,
        CMP_REG_WITH_REG: 83,
        CMP_REGADDRESS_WITH_REG: 88,
        CMP_ADDRESS_WITH_REG: 93,
        CMP_NUMBER_WITH_REG: 98,
        JMP_ADDRESS: 103,
        JMP_REGADDRESS: 104,
        JC_ADDRESS: 105,
        JC_REGADDRESS: 106,
        JNC_ADDRESS: 107,
        JNC_REGADDRESS: 108,
        JZ_ADDRESS: 109,
        JZ_REGADDRESS: 110,
        JNZ_ADDRESS: 111,
        JNZ_REGADDRESS: 112,
        JA_ADDRESS: 113,
        JA_REGADDRESS: 114,
        JNA_ADDRESS: 115,
        JNA_REGADDRESS: 116,
        PUSH_REG_A: 117,
        PUSH_REG_B: 118,
        PUSH_REG_C: 119,
        PUSH_REG_D: 120,
        PUSH_REGADDRESS: 121,
        PUSH_ADDRESS: 122,
        PUSH_NUMBER: 123,
        POP_REG_A: 124,
        POP_REG_B: 125,
        POP_REG_C: 126,
        POP_REG_D: 127,
        CALL_REGADDRESS: 128,
        CALL_ADDRESS: 129,
        RET: 130,
        MUL_REG: 131,
        MUL_REGADDRESS: 135,
        MUL_ADDRESS: 136,
        MUL_NUMBER: 137,
        DIV_REG: 138,
        DIV_REGADDRESS: 142,
        DIV_ADDRESS: 143,
        DIV_NUMBER: 144,
        AND_REG_WITH_REG: 145,
        AND_REGADDRESS_WITH_REG: 149,
        AND_ADDRESS_WITH_REG: 153,
        AND_NUMBER_WITH_REG: 157,
        OR_REG_WITH_REG: 161,
        OR_REGADDRESS_WITH_REG: 165,
        OR_ADDRESS_WITH_REG: 169,
        OR_NUMBER_WITH_REG: 173,
        XOR_REG_WITH_REG: 177,
        XOR_REGADDRESS_WITH_REG: 181,
        XOR_ADDRESS_WITH_REG: 185,
        XOR_NUMBER_WITH_REG: 189,
        NOT_REG: 193,
        SHL_REG_WITH_REG: 197,
        SHL_REGADDRESS_WITH_REG: 201,
        SHL_ADDRESS_WITH_REG: 205,
        SHL_NUMBER_WITH_REG: 209,
        SHR_REG_WITH_REG: 213,
        SHR_REGADDRESS_WITH_REG: 217,
        SHR_ADDRESS_WITH_REG: 221,
        SHR_NUMBER_WITH_REG: 225
    };

    return opcodes;
}]);
