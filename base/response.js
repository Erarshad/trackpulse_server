class ApiResponse {
    constructor(code, message, data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    toJSON() {
        return {


            code: this.code,
            message: this.message,
            data: this.data


        };
    }
}

module.exports = { ApiResponse };
