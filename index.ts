import { MongoClient } from 'mongodb'
import "dotenv/config";

const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string);
 async function startServer(){
    try {
        await client.connect()
        await client.db("admin").command({ping:1})
        console.log("pinged it")
        
    } catch (error) {
        console.error("error connecting to mongodb",error)
        process.exit(1)
        
    }
 }

 startServer()

