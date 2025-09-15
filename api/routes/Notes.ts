import { ObjectId } from 'mongodb';
import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

export default function (app: any, deps: any) {
    const {
        validate,
        validationSchemas,
        validationSets,
        sanitizeInput,
        logger,
        obfuscateUsername,
        MongoClient,
        uri
    } = deps;

    // endpoint to create new notes 
    app.post('/:symbol/notes',
        validate([
            validationSchemas.symbol('symbol'),
            validationSchemas.note('note'),
            validationSchemas.Username('Username')
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                // Type-safe extraction of params and body
                const symbolParam = req.params.symbol;
                const { note, Username } = req.body as {
                    note?: string;
                    Username?: string;
                };
                if (!symbolParam || !note || !Username) {
                    logger.warn({
                        msg: 'Missing required fields',
                        context: 'POST /:symbol/notes',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Invalid input' });
                }
                const ticker = symbolParam.toUpperCase();
                const sanitizedNote = sanitizeInput(note);
                const sanitizedUsername = sanitizeInput(Username);

                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /:symbol/notes',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Notes');

                // Check number of existing notes for the user and symbol
                const existingNotesCount = await collection.countDocuments({
                    Symbol: ticker,
                    Username: sanitizedUsername
                });
                if (existingNotesCount >= 10) {
                    logger.warn({
                        msg: 'Note Creation Failed',
                        reason: 'Maximum note limit reached',
                        symbol: ticker,
                        usernamePartial: sanitizedUsername,
                        context: 'POST /:symbol/notes',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Maximum note limit (10) reached for this symbol' });
                }

                // Create a new note object using sanitized inputs
                const currentDate = new Date();
                const newNote = {
                    Symbol: ticker,
                    Message: sanitizedNote,
                    Username: sanitizedUsername,
                    Date: currentDate,
                };

                // Insert the new note object into the MongoDB collection
                const result = await collection.insertOne(newNote);
                if (!result.insertedId) {
                    logger.error({
                        msg: 'Note Insertion Failed',
                        symbol: ticker,
                        usernamePartial: sanitizedUsername,
                        context: 'POST /:symbol/notes',
                        statusCode: 500
                    });
                    return res.status(500).json({ message: 'Failed to insert note' });
                }
                res.status(201).json({
                    message: 'Note inserted successfully',
                    note: newNote
                });
            } catch (error) {
                const errObj = handleError(error, 'POST /:symbol/notes', { user: req.body?.Username }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'POST /:symbol/notes'
                        });
                    }
                }
            }
        }
    );

    // endpoint to search notes 
    app.get('/:user/:symbol/notes', validate(validationSets.notesSearch),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                // Type-safe extraction of params
                const symbolParam = req.params.symbol;
                const userParam = req.params.user;
                if (!symbolParam || !userParam) {
                    logger.warn({
                        msg: 'Missing required fields',
                        context: 'GET /:user/:symbol/notes',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Invalid input' });
                }
                const ticker = symbolParam.toUpperCase();
                const sanitizedTicker = sanitizeInput(ticker);
                const sanitizedUsername = sanitizeInput(userParam);

                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:user/:symbol/notes',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Notes');

                // Find all notes for the given symbol and Username
                const notes = await collection.find({
                    Symbol: sanitizedTicker,
                    Username: sanitizedUsername
                }).toArray();
                if (!notes || notes.length === 0) {
                    logger.warn({
                        msg: 'No notes found',
                        symbol: sanitizedTicker,
                        usernamePartial: sanitizedUsername,
                        context: 'GET /:user/:symbol/notes',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'No notes found' });
                }
                res.status(200).json(notes);
            } catch (error) {
                const errObj = handleError(error, 'GET /:user/:symbol/notes', { user: req.params?.user }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'GET /:user/:symbol/notes'
                        });
                    }
                }
            }
        });

    // endpoint to delete a note
    app.delete('/:symbol/notes/:noteId', validate(validationSets.notesDeletion),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                // Type-safe extraction of params and query
                const symbolParam = req.params.symbol;
                const noteIdParam = req.params.noteId;
                const userParam = req.query.user;
                if (!symbolParam || !noteIdParam || !userParam) {
                    logger.warn({
                        msg: 'Missing required fields',
                        context: 'DELETE /:symbol/notes/:noteId',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Invalid input' });
                }
                const ticker = symbolParam.toUpperCase();
                const sanitizedUsername = sanitizeInput(userParam as string);

                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'DELETE /:symbol/notes/:noteId',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Notes');

                // Find and delete the note with the given id, symbol, and Username
                const result = await collection.findOneAndDelete({
                    _id: new ObjectId(noteIdParam),
                    Symbol: ticker,
                    Username: sanitizedUsername
                });
                if (!result.value) {
                    logger.warn({
                        msg: 'Note Not Found',
                        symbol: ticker,
                        usernamePartial: sanitizedUsername,
                        noteId: noteIdParam,
                        context: 'DELETE /:symbol/notes/:noteId',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Note not found' });
                }
                res.status(200).json({ message: 'Note deleted successfully' });
            } catch (error) {
                const errObj = handleError(error, 'DELETE /:symbol/notes/:noteId', { user: req.query?.user }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'DELETE /:symbol/notes/:noteId'
                        });
                    }
                }
            }
        }
    );

}