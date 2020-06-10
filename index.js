const client = require("./client");
const endpointUrl = "opc.tcp://192.168.11.90:49320";
const nodeId = "ns=2;s=LEVEL.ДСП";
const nodeVal = "ns=2;s=LEVEL.ДСП.кислород";
const root = "RootFolder";

async function Main() {

    await client.connect(endpointUrl).then();
    await client.browse(nodeId);
    let val = await client.readValue(nodeVal);
    let name = await client.readName(nodeVal);
    console.log(name.value.value.name, " => ", val.value.value);
    await client.disconnect();

}

Main().then();
