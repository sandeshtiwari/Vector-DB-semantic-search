const axios = require('axios');
// import axios from 'axios';
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MDB_CONNECTION_STRING = process.env.MDB_CONNECTION_STRING;

async function getEmbedding(query) {
  // Define the OpenAI API url and key.
  const url = 'https://api.openai.com/v1/embeddings';
  const openai_key = OPENAI_API_KEY; // Replace with your OpenAI key.

  // Call OpenAI API to get the embeddings.
  let response = await axios.post(
    url,
    {
      input: query,
      model: 'text-embedding-ada-002',
    },
    {
      headers: {
        Authorization: `Bearer ${openai_key}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 200) {
    return response.data.data[0].embedding;
  } else {
    throw new Error(`Failed to get embedding. Status code: ${response.status}`);
  }
}

async function findSimilarDocuments(embedding) {
  const url = MDB_CONNECTION_STRING; // Replace with your MongoDB url.
  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('Connection Success!');

    const db = client.db('sample_mflix'); // Replace with your database name.
    const collection = db.collection('movies'); // Replace with your collection name.

    // Refactor your query to use $search with knnBeta.
    const mongo_query = [
      {
        $search: {
          index: 'moviesPlotIndex', // Use your original index.
          knnBeta: {
            vector: embedding,
            path: 'plot_embedding', // Your original path.
            k: 5, // Assuming 'k' corresponds to your original 'limit' value.
          },
        },
      },
      {
        $project: {
          _id: 0,
          title: 1,
          plot: 1,
        },
      },
    ];

    // Query for similar documents.
    const documents = await collection.aggregate(mongo_query);
    const documentsArray = await documents.toArray();

    return documentsArray;
  } catch (error) {
    console.error('Error finding similar documents:', error);
    throw error; // or handle the error as appropriate
  } finally {
    await client.close();
  }
}

// async function findSimilarDocuments(embedding) {
//   const url = MDB_CONNECTION_STRING; // Replace with your MongoDB url.
//   const client = new MongoClient(url);

//   try {
//     await client.connect();
//     console.log('Connection Success!');

//     const db = client.db('sample_mflix'); // Replace with your database name.
//     const collection = db.collection('movies'); // Replace with your collection name.

//     // Query for similar documents.
//     const documents = await collection.aggregate([
//       {
//         $vectorSearch: {
//           queryVector: embedding,
//           path: 'plot_embedding',
//           numCandidates: 100,
//           limit: 5,
//           index: 'moviesPlotIndex',
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           title: 1,
//           plot: 1,
//         },
//       },
//     ]);
//     const documentsArray = await documents.toArray();

//     return documentsArray;
//   } catch (error) {
//     console.error('Error finding similar documents:', error);
//     throw error; // or handle the error as appropriate
//   } finally {
//     await client.close();
//   }
// }

async function main() {
  const query = 'Time dilation'; // Replace with your query.

  try {
    const embedding = await getEmbedding(query);
    const documents = await findSimilarDocuments(embedding);

    console.log(documents);
  } catch (err) {
    console.error(err);
  }
}

main();
