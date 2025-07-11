import { ObjectId } from 'mongodb';

export default function (app, deps) {
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
        async (req, res) => {
            const ticker = req.params.symbol.toUpperCase();
            const { note, Username } = req.body;

            // Sanitize inputs
            const sanitizedNote = sanitizeInput(note);
            const sanitizedUsername = sanitizeInput(Username);

            let client;

            try {
                const apiKey = req.header('x-api-key');

                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', {
                        providedApiKey: !!sanitizedKey
                    });

                    return res.status(401).json({
                        message: 'Unauthorized API Access'
                    });
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

                // Check if user has reached the note limit
                if (existingNotesCount >= 10) {
                    logger.warn({
                        msg: 'Note Creation Failed',
                        reason: 'Maximum note limit reached',
                        symbol: ticker,
                        usernamePartial: obfuscateUsername(sanitizedUsername)
                    });

                    return res.status(400).json({
                        message: 'Maximum note limit (10) reached for this symbol'
                    });
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
                        usernamePartial: obfuscateUsername(sanitizedUsername)
                    });

                    return res.status(500).json({ message: 'Failed to insert note' });
                }
                res.status(201).json({
                    message: 'Note inserted successfully',
                    note: newNote
                });

            } catch (error) {
                // Log any unexpected errors
                logger.error({
                    msg: 'Note Creation Error',
                    error: error.message,
                    symbol: ticker,
                    usernamePartial: sanitizedUsername ? obfuscateUsername(sanitizedUsername) : 'Unknown'
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint to search notes 
    app.get('/:user/:symbol/notes', validate(validationSets.notesSearch),
        async (req, res) => {
            const ticker = req.params.symbol.toUpperCase();
            const Username = req.params.user;

            // Light sanitization
            const sanitizedTicker = sanitizeInput(ticker);
            const sanitizedUsername = sanitizeInput(Username);

            let client;

            try {
                const apiKey = req.header('x-api-key');

                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', {
                        providedApiKey: !!sanitizedKey
                    });

                    return res.status(401).json({
                        message: 'Unauthorized API Access'
                    });
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
                    return res.status(404).json({ message: 'No notes found' });
                }

                res.status(200).json(notes);

                client.close();
            } catch (error) {
                // Log any unexpected errors
                logger.error({
                    msg: 'Note Search Error',
                    error: error.message,
                    symbol: sanitizedTicker,
                    usernamePartial: Username ? obfuscateUsername(Username) : 'Unknown'
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

    // endpoint to delete a note
    app.delete('/:symbol/notes/:noteId', validate(validationSets.notesDeletion),
        async (req, res) => {
            const ticker = req.params.symbol.toUpperCase();
            const noteId = req.params.noteId;
            const Username = req.query.user;
            const apiKey = req.header('x-api-key');

            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', {
                    providedApiKey: !!sanitizedKey
                });

                return res.status(401).json({
                    message: 'Unauthorized API Access'
                });
            }

            let client;
            try {
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Notes');

                // Find and delete the note with the given id, symbol, and Username
                const result = await collection.findOneAndDelete({
                    _id: new ObjectId(noteId),
                    Symbol: ticker,
                    Username: Username
                });

                if (!result.value) {
                    logger.warn({
                        msg: 'Note Not Found',
                        symbol: ticker,
                        usernamePartial: obfuscateUsername(Username),
                        noteId: noteId
                    });

                    return res.status(404).json({ message: 'Note not found' });
                }

                res.status(200).json({ message: 'Note deleted successfully' });
            } catch (error) {
                // Log any unexpected errors
                logger.error({
                    msg: 'Note Deletion Error',
                    error: error.message,
                    symbol: ticker,
                    usernamePartial: Username ? obfuscateUsername(Username) : 'Unknown',
                    noteId: noteId
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) {
                    await client.close();
                }
            }
        }
    );

}