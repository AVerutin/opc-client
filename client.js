const {
    OPCUAClient,
    ClientSubscription,
    AttributeIds
} = require("node-opcua");

let client;
let subscription;

const opcClient = {
    session: null,

    connect: async function (endpointUrl) {
        // Подключение к OPC-серверу
        client = OPCUAClient.create({
            endpoint_must_exist: false,
            defaultSecureTokenLifetime: 40000,
            keepSessionAlive: true
        });
        await client.connect(endpointUrl);
        this.session = await client.createSession();
    },

    browse: async function (node) {
        // Просмотр потомков узла
        let data = {};
        const browseResult = await this.session.browse(node);
        for (let r of browseResult.references) {
            data[r] = r;
        }
    },

    readValue: async function (nodeId) {
        // Чтение значения узла (value)
        let data_value = await this.session.read ( {nodeId: nodeId, attributeId: AttributeIds.Value} );
        return data_value;
    },

    readName: async function (nodeId) {
        // Чтение свойчтва DisplayName
        let data_name = await this.session.read ( {nodeId: nodeId, attributeId: AttributeIds.BrowseName} );
        return data_name;
    },

    disconnect: async function () {
        // Отключение от OPC-сервера
        await client.disconnect();
    },
}

module.exports = opcClient;
