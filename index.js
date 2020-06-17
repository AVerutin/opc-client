// const {
//     OPCUAClient,
//     ClientSubscription,
//     AttributeIds
// } = require("node-opcua");

const opcua = require('node-opcua');

// const endpointUrl = "opc.tcp://opcuademo.sterfive.com:26543";
// const nodeId = "ns=1;s=Temperature";
const endpointUrl = "opc.tcp://192.168.11.90:49320";
const nodeId = "ns=2;s=LEVEL.ДСП.б процент расплава";

async function main() {

    try {

        const client = opcua.OPCUAClient.create({
            endpoint_must_exist: false,
            connectionStrategy: {
                maxRetry: 2,
                initialDelay: 2000,
                maxDelay: 10 * 1000
            }
        });
        client.on("backoff", () => console.log("retrying connection"));


        await client.connect(endpointUrl);

        const session = await client.createSession();

        const browseResult = await session.browse("RootFolder");
        console.log(browseResult.references.map((r) => r.browseName.toString()).join("\n"));

        const dataValue = await session.read({ nodeId: nodeId, attributeId: opcua.AttributeIds.Value });
        console.log(` temperature = ${dataValue.value.value.toString()}`);

        // step 5: install a subscription and monitored item
        const subscription = opcua.ClientSubscription.create(session, {
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 10,
            requestedMaxKeepAliveCount: 2,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10
        });

        subscription
            .on("started", () => console.log("subscription started - subscriptionId=", subscription.subscriptionId))
            .on("keepalive", () => console.log("keepalive"))
            .on("terminated", () => console.log("subscription terminated"));


        const monitoredItem = await subscription.monitor({
            nodeId: nodeId,
            attributeId: opcua.AttributeIds.Value
        },
            {
                samplingInterval: 1000,
                discardOldest: true,
                queueSize: 10
            }, opcua.TimestampsToReturn.Both);


        monitoredItem.on("changed", (dataValue) => console.log(` Temperature = ${dataValue.value.value.toString()}`));

        await new Promise((resolve) => setTimeout(resolve, 100000));

        await subscription.terminate();

        console.log(" closing session");
        await session.close();

        await client.disconnect();
    }
    catch (err) {
        console.log("Error !!!", err);
        process.exit();
    }
}

main();
