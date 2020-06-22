const opcua = require("node-opcua");
const { Pool } = require('pg');
const config = require("config");

let dbpool = 0;
let the_session = 0;
const client = opcua.OPCUAClient.create({requestedSessionTimeout: 20000});


async function createDb() {
    try { 
        await dbpool.query(sqlCreateTable);
    } catch (e) {
        console.log(e);
        return false;
    }
    return true;
}

const sqlInsert = "INSERT INTO Nodes (Name, Value) VALUES ($1, $2) RETURNING ID;";
const sqlUpdate = "UPDATE Nodes SET Value = $1 WHERE ID = $2;";
const sqlNodeID = "SELECT ID FROM Nodes WHERE Name = $1;";
const sqlCreateTable = "CREATE TABLE IF NOT EXISTS Nodes (ID serial PRIMARY KEY, Name TEXT NOT NULL, Value numeric NOT NULL);";

const BrowseDirection = {
    Forward: 0,
    Inverse: 1,
    Both: 2,
    Invalid: 3
}

const Opcua = {
    dataType: opcua.DataType,

    init: async function(){
        dbpool = new Pool(config.get("dbConfig"));
        
        if (!createDb()) {
            console.log('DB connection error!');
            return -1;
        }
    },

    // Подключение к OPC-серверу
    connect: async function(endpoint)  {
        await client.connect(endpoint);
        the_session = await client.createSession();
    },

    // Чтение значения ключа
    read_value: async function(nodeid) {
        let val = await the_session.readVariableValue(nodeid);
        return val.value.value;
    },

    // Подписка на события
    set_subs: async function(node_path, node_name, timeout = 0) {
        // Проверить наличие записи в БД с именем node_name
        // если такой записи не существует, то создать и получить ID для вновь созданной записи
        let nodeID = false;
        let result = false;

        try {
            result = await dbpool.query(sqlNodeID, [node_name]);
        } catch (e) {
            console.log('DB Error: ', e);
        }

        if (result.rows.length == 0 ) {
            // Нет записи для текущего узла
            let vals = [node_name, 0];
            try {
                result = await dbpool.query(sqlInsert, vals);
            } catch (e) {
                console.log("DB Error: ", e);
            }
            if (result.rows.length > 0) {
                nodeID = result.rows[0].id;
            }
        } else {
            nodeID = result.rows[0].id;
        }

        // Массив значений наименований ключей
        const nodeid = node_path + node_name;
        the_subscription = opcua.ClientSubscription.create(the_session,{
            requestedPublishingInterval: 500,
            requestedLifetimeCount: 10,
            requestedMaxKeepAliveCount: 5,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 1
        });

        the_subscription.on("started",function(){
            console.log("subscription started [subscriptionId=", the_subscription.subscriptionId, "]");
        })

        the_subscription.on("terminated",function(){
            console.log("terminated");
            disconnect();
        });

        // Таймер для прекращения подписки и прерывание цикла обработки событий
        if (timeout > 0) {
            setTimeout(function () {
                the_subscription.terminate();
            }, timeout);
        }

        // install monitored item
        let monitoredItem = await the_subscription.monitor(
            {
                nodeId: opcua.resolveNodeId(nodeid),
                attributeId: opcua.AttributeIds.Value
            },
            {
                samplingInterval: 250,
                discardOldest: true,
                queueSize: 1
            },
            opcua.TimestampsToReturn.Both); // opcua.TimestampsToReturn.Both = 2
        

        monitoredItem.on("changed", function(dataValue){
            // Функция, вызываемая при изменении значения у переменной,
            // на которую оформлена подписка
            let value = dataValue.value.value;
            let res = 0;
            try {
                res = dbpool.query(sqlUpdate, [value, nodeID]);
            } catch (e) {
                console.log("DB Error: ", e);
            }
            if (res ==0 ) {
                console.log("DB => updated 0 rows!");
            }
        });
    },

    browseNode: async function(nodeID) {
        // Получение всех потомков узла
        const nodesToBrowse = [{
            nodeId: nodeID,
            referenceTypeId: "Organizes",
            includeSubtypes: true,
            browseDirection: BrowseDirection.Forward,
            resultMask: 0x3f
        },
        {
            nodeId: nodeID,
            referenceTypeId: "Aggregates",
            includeSubtypes: true,
            browseDirection: BrowseDirection.Forward,
            resultMask: 0x3f
        },
        {
            nodeId: nodeID,
            referenceTypeId: "HasSubtype",
            includeSubtypes: true,
            browseDirection: BrowseDirection.Forward,
            resultMask: 0x3f
        },];
        let results = 0;
        try {
            results = await the_session.browse(nodesToBrowse);
        } catch (e) {
            console.log("Ошибка при просмотре узла: ", e);
        }
        const children = []; // Список ссылок на всех потомков заданного узла

        const res1 = results[0];
        if (res1.references) {
            for (let i = 0; i < res1.references.length; i++) {
                const ref = res1.references[i];
                children.push({
                    browseName: ref.browseName.toString(),
                    nodeId: ref.nodeId,
                    nodeClass: ref.nodeClass,
                });
            }
        }

        const res2 = results[1];
        if (res2.references) {
            for (let i = 0; i < res2.references.length; i++) {
                const ref = res2.references[i];
                children.push({
                    browseName: ref.browseName.toString(),
                    nodeId: ref.nodeId,
                    nodeClass: ref.nodeClass,
                });
            }
        }

        const res3 = results[2];
        if (res3.references) {
            for (let i = 0; i < res3.references.length; i++) {
                const ref = res3.references[i];
                children.push({
                    browseName: ref.browseName.toString(),
                    nodeId: ref.nodeId,
                    nodeClass: ref.nodeClass,
                });
            }
        }

        // for (let child of children) {
        //     console.log(`[${child.browseName}] => Class (${child.nodeClass}) => Path (${child.nodeId.value})`);
        // }
    },

    // Write value on node
    writeNodeValue: async function(nodeId, dataType, newValue) {
        let res = 0;
        var nodesToWrite = [
        {
            nodeId: nodeId,
            attributeId: opcua.AttributeIds.Value,
            value: {
            value: {
                dataType: dataType,
                value: newValue
            }
            }
        }
        ];
    
        try {
            res = await the_session.write(nodesToWrite);
        } catch (e) {
            console.log(e);
        }
        return res;
    },

    // close session
    disconnect: async function() {
        await the_session.close(function(err){
            if(err) {
                console.log("session closed failed ?");
            }
        });
        await client.disconnect();
    }
};

module.exports = Opcua;
