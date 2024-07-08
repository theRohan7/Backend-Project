import mongoose from "mongoose";

import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
       const conectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\n MongoDB connected !! DB HOST: ${conectionInstance.connection.host}`); 
    } catch (error) {
        console.log('MONGO DB CONNECTION failed', error);
        process.exit(1)
        
    }
}


export default connectDB;