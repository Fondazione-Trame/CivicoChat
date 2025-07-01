const express = require('express');
    const mysql = require('mysql2/promise');
    const bcrypt = require('bcrypt');
    const cors = require('cors');
    const bodyParser = require('body-parser');
    const jwt = require('jsonwebtoken');
    const os = require('os');
    const app = express();
    const PORT = 3000;
    const JWT_SECRET = 'civico_chat_secret_key';

    app.use(cors());
    app.use(bodyParser.json());
    app.use(express.static('/'));

    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'civico',
        password: 'tramala25',
        database: 'civico_chat'
    });

    const authenticateToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ error: 'Accesso negato' });

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Token non valido' });
            req.user = user;
            next();
        });
    };

    app.post('/api/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

            if (rows.length === 0) {
                return res.status(401).json({ error: 'Credenziali non valide' });
            }

            const user = rows[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ error: 'Credenziali non valide' });
            }

            const token = jwt.sign({
                id: user.id,
                username: user.username,
                isAdmin: user.is_admin
            }, JWT_SECRET, { expiresIn: '1h' });

            const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const now = new Date();
            const dateTimeString = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT');

            console.log(`Utente loggato: ${username} il ${dateTimeString} dall'IP: ${userIP}`);

            res.json({
                token,
                user: {
                    username: user.username,
                    isAdmin: user.is_admin
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore del server' });
        }
    });

    app.post('/api/register', async (req, res) => {
        try {
            const { username, password } = req.body;
            const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

            if (existingUsers.length > 0) {
                return res.status(400).json({ error: 'Username già in uso' });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            await pool.query(
                'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
                [username, hashedPassword, false]
            );

            const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const now = new Date();
            const dateTimeString = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT');

            console.log(`NUOVA REGISTRAZIONE: ${username} il ${dateTimeString} dall'IP: ${userIP}`);

            res.status(201).json({ message: 'Utente registrato con successo' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore del server' });
        }
    });

    app.get('/api/shifts', authenticateToken, async (req, res) => {
        try {
            let query = 'SELECT * FROM shifts';
            const params = [];

            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore del server' });
        }
    });

    app.post('/api/shifts', authenticateToken, async (req, res) => {
        try {
            const { volunteer, service, shift_date, start_time, end_time, activity, notes } = req.body;

            const [result] = await pool.query(
                'INSERT INTO shifts (volunteer, service, shift_date, start_time, end_time, activity, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [volunteer, service, shift_date, start_time, end_time, activity, notes, req.user.username]
            );

            res.status(201).json({
                id: result.insertId,
                message: 'Turno aggiunto con successo'
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore del server' });
        }
    });

    app.delete('/api/shifts/:id', authenticateToken, async (req, res) => {
        try {
            const shiftId = req.params.id;

            if (!req.user.isAdmin) {
                const [shift] = await pool.query('SELECT * FROM shifts WHERE id = ?', [shiftId]);

                if (shift.length === 0) {
                    return res.status(404).json({ error: 'Turno non trovato' });
                }

                if (shift[0].created_by !== req.user.username) {
                    return res.status(403).json({ error: 'Non hai il permesso di eliminare questo turno' });
                }
            }

            await pool.query('DELETE FROM shifts WHERE id = ?', [shiftId]);
            res.json({ message: 'Turno eliminato con successo' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore del server' });
        }
    });

    app.get('/api/messages', authenticateToken, async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM messages ORDER BY timestamp');
            res.json(rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore del server' });
        }
    });

    app.post('/api/messages', authenticateToken, async (req, res) => {
        try {
            const { content } = req.body;
            await pool.query(
                'INSERT INTO messages (sender, content) VALUES (?, ?)',
                [req.user.username, content]
            );
            res.status(201).json({ message: 'Messaggio inviato con successo' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore del server' });
        }
    });

    app.get('/api/server-info', authenticateToken, (req, res) => {
        try {
            const serverInfo = {
                platform: os.platform(),
                architecture: os.arch(),
                hostname: os.hostname(),
                cpus: os.cpus().length,
                totalMemory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
                freeMemory: `${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`,
                uptime: `${Math.floor(os.uptime() / 3600)} ore e ${Math.floor((os.uptime() % 3600) / 60)} minuti`,
                nodeVersion: process.version,
                expressVersion: require('express/package.json').version
            };

            res.json(serverInfo);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Errore nel recupero delle informazioni del server' });
        }
    });

// Recupera tutti i permessi (admin vede tutti, utenti normali solo i propri)
app.get('/api/permessi', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM permessi';
        const params = [];

        // Se non è admin, mostra solo i propri permessi
        if (!req.user.isAdmin) {
            query += ' WHERE richiesto_da = ?';
            params.push(req.user.username);
        }

        query += ' ORDER BY data_richiesta DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// Crea un nuovo permesso
app.post('/api/permessi', authenticateToken, async (req, res) => {
    try {
        const { tipo, data_inizio, data_fine, motivo } = req.body;

        const [result] = await pool.query(
            'INSERT INTO permessi (tipo, data_inizio, data_fine, motivo, stato, richiesto_da) VALUES (?, ?, ?, ?, ?, ?)',
            [tipo, data_inizio, data_fine, motivo, 'IN_ATTESA', req.user.username]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Permesso richiesto con successo'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// Approva o rifiuta un permesso (solo admin)
app.put('/api/permessi/:id', authenticateToken, async (req, res) => {
    try {
        const permessoId = req.params.id;
        const { stato, note_risposta } = req.body;

        // Verifica che sia admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Non hai i permessi per eseguire questa operazione' });
        }

        // Aggiorna il permesso
        await pool.query(
            'UPDATE permessi SET stato = ?, note_risposta = ?, gestito_da = ?, data_risposta = NOW() WHERE id = ?',
            [stato, note_risposta, req.user.username, permessoId]
        );

        res.json({ message: 'Permesso aggiornato con successo' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// Elimina un permesso (solo l'utente che l'ha creato o admin)
app.delete('/api/permessi/:id', authenticateToken, async (req, res) => {
    try {
        const permessoId = req.params.id;

        // Se non è admin, verifica che sia il creatore
        if (!req.user.isAdmin) {
            const [permesso] = await pool.query('SELECT * FROM permessi WHERE id = ?', [permessoId]);

            if (permesso.length === 0) {
                return res.status(404).json({ error: 'Permesso non trovato' });
            }

            if (permesso[0].richiesto_da !== req.user.username) {
                return res.status(403).json({ error: 'Non hai il permesso di eliminare questa richiesta' });
            }
        }

        await pool.query('DELETE FROM permessi WHERE id = ?', [permessoId]);
        res.json({ message: 'Permesso eliminato con successo' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore del server' });
    }
});

// Aggiungere alla fine di server.js prima di app.listen

// Endpoint per le statistiche settimanali/mensili
app.get('/api/statistics', authenticateToken, async (req, res) => {
    try {
        const { period } = req.query; // 'weekly' o 'monthly'

        let query;
        if (period === 'weekly') {
            query = `
                SELECT 
                    YEARWEEK(shift_date, 1) as week_num,
                    CONCAT(DATE_FORMAT(MIN(shift_date), '%d/%m/%Y'), ' - ', DATE_FORMAT(MAX(shift_date), '%d/%m/%Y')) as week_range,
                    COUNT(*) as total_shifts,
                    SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))/3600) as total_hours,
                    COUNT(DISTINCT volunteer) as unique_volunteers,
                    service,
                    ROUND(AVG(TIME_TO_SEC(TIMEDIFF(end_time, start_time))/3600), 1) as avg_shift_hours
                FROM shifts
                WHERE shift_date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
                GROUP BY YEARWEEK(shift_date, 1), service
                ORDER BY week_num DESC, service
            `;
        } else {
            query = `
                SELECT 
                    YEAR(shift_date) as year,
                    MONTH(shift_date) as month,
                    DATE_FORMAT(shift_date, '%m/%Y') as month_name,
                    COUNT(*) as total_shifts,
                    SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))/3600) as total_hours,
                    COUNT(DISTINCT volunteer) as unique_volunteers,
                    service,
                    ROUND(AVG(TIME_TO_SEC(TIMEDIFF(end_time, start_time))/3600), 1) as avg_shift_hours
                FROM shifts
                WHERE shift_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY YEAR(shift_date), MONTH(shift_date), service
                ORDER BY year DESC, month DESC, service
            `;
        }

        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.listen(PORT, '127.0.0.1', async () => {
        const platform = os.platform();
        const arch = os.arch();
        const nodeVersion = process.version;
        const memoryUsage = process.memoryUsage();
        const heapUsed = Math.round(memoryUsage.heapUsed / (1024 * 1024));

        console.clear();
        console.log(``)
        console.log(`

                                                                             
 ,-----.,--.          ,--.                  ,-----.,--.               ,--.   
'  .--./\`--',--.  ,--.\`--' ,---. ,---.     '  .--./|  ,---.  ,--,--.,-'  '-. 
|  |    ,--. \\  \`'  / ,--.| .--'| .-. |    |  |    |  .-.  |' ,-.  |'-.  .-' 
'  '--'\\|  |  \\    /  |  |\\ \`--.' '-' '    '  '--'\\|  | |  |\\ '-'  |  |  |   
 \`-----'\`--'   \`--'   \`--' \`---' \`---'      \`-----'\`--' \`--' \`--\`--'  \`--'   
                                                                             

`);
        console.log(`Civico Chat Server - Versione 1.0`);
        console.log(``)
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`By VincenzoT`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.clear();
        console.log(`
                                                                             
 ,-----.,--.          ,--.                  ,-----.,--.               ,--.   
'  .--./\`--',--.  ,--.\`--' ,---. ,---.     '  .--./|  ,---.  ,--,--.,-'  '-. 
|  |    ,--. \\  \`'  / ,--.| .--'| .-. |    |  |    |  .-.  |' ,-.  |'-.  .-' 
'  '--'\\|  |  \\    /  |  |\\ \`--.' '-' '    '  '--'\\|  | |  |\\ '-'  |  |  |   
 \`-----'\`--'   \`--'   \`--' \`---' \`---'      \`-----'\`--' \`--' \`--\`--'  \`--'   
                                                                             

`);
        console.log(``);
        console.log(`=======================================================================`);
        console.log(``);
        console.log(`Server avviato sulla porta ${PORT}`);
        console.log(`OS: ${platform} (${arch})`);
        console.log(`Node.js: ${nodeVersion}`);
        console.log(`Memoria utilizzata: ${heapUsed}MB`);
        console.log(`Server avviato alle: ${new Date().toLocaleString('it-IT')}`);
        console.log(`Hostname: ${os.hostname()}`);
        console.log(``);
        console.log(`CivicoChat By VincenzoT`);
        console.log(`Per problemi conttattare 3398659697`);
        console.log(`SCU 2025/2026`);
        console.log(``);
        console.log(`=======================================================================`);
        console.log(``);
        console.log(``)
        console.log(`======LOGS======`);
    });