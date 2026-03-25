-- MySQL dump 10.13  Distrib 8.0.42, for macos15 (x86_64)
--
-- Host: 127.0.0.1    Database: mini_task_manager
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '9d467318-c2c2-11f0-a514-f5199abbdb16:1-18221,
bbb87c08-d251-11f0-a94d-c87b0ed70aab:1-234';

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `user_id` binary(16) DEFAULT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` binary(16) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_activity_user` (`user_id`),
  KEY `idx_activity_org` (`organization_id`),
  KEY `idx_activity_created` (`created_at`),
  CONSTRAINT `fk_activity_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
INSERT INTO `activity_logs` VALUES (_binary '.R\ât\ÏKÃF\êØ',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '×œ\ÌJLTªHFL6\æ','update','{\"name\": \"Task 2\"}','2026-03-22 13:35:18'),(_binary '\n2h‰.@I\n‹%\İ\ï\É',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '×œ\ÌJLTªHFL6\æ','move','{\"name\": \"Task 2\"}','2026-03-22 13:23:15'),(_binary '¥˜ÿsqIü¯h\Ø\Æ6uSF',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','move','{\"name\": \"Task 3\"}','2026-03-22 14:14:59'),(_binary '\Z…¿\ÇN¥¼\âbS}`\Ï',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '×œ\ÌJLTªHFL\0\0','create','{\"name\": \"Task 2\"}','2026-03-22 13:23:10'),(_binary '*»\çÌ–A†œÑŒ‡]¡&',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ã\0\0','create','{\"name\": \"Task 2\"}','2026-03-22 19:10:13'),(_binary '\'AW—aC	«z\İÀvVu',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 13:56:32'),(_binary '…ñ,Et€ˆ”Îš\'V',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Òı!\Üÿ[HS¿5‘Ê­‚$','update','{\"name\": \"Task 4\"}','2026-03-22 20:22:14'),(_binary '\Ï\ÂÛ­L/ ¿—  ·Ø©',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','move','{\"name\": \"Task 3\"}','2026-03-22 14:27:22'),(_binary '$üS]FBº\0­—‡\î\Ö',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '×œ\ÌJLTªHFL6\æ','move','{\"name\": \"Task 2\"}','2026-03-22 15:16:56'),(_binary '$ÚºSoBÓ³÷$\',B¾',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 13:56:41'),(_binary '&8\Æ\ÛğI-«)G=×Ÿl4',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 14:26:47'),(_binary ')¤]»/LO½\Z¹‡úÔ”™',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'Á8b7–@®¢\êC¦Xz0','update','{\"name\": \"Task 1\"}','2026-03-22 13:43:23'),(_binary '.«S9/2Jƒ·\é\ás˜\n\Æ',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '(¹)\Í\r/L²3S8•Z	','update','{\"name\": \"Bring vegetables from market\"}','2026-03-22 15:14:37'),(_binary '0»P\ÌEMƒ‹|¶\Ğ\'Õ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Ç*‡»m1E~¤\×?\çxHx','update','{\"name\": \"Task 1\"}','2026-03-23 17:05:31'),(_binary '7\ÃM¿\Ö(KÕ¤)­~¼\ÑN',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','move','{\"name\": \"Task 3\"}','2026-03-22 14:27:00'),(_binary '=sªe¡AÇ–¿°=™|«',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 13:57:13'),(_binary 'D\ÃLe\ĞF!·\"7‘{+',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '(¹)\Í\r/L²3S8•Z	','update','{\"name\": \"Bring vegetables from market\"}','2026-03-22 15:14:27'),(_binary 'F¢FQ¹­Jt€z¶%\Í\Ò!f',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH','move','{\"name\": \"Task 2\"}','2026-03-23 17:08:53'),(_binary 'F¸/`´…N¹˜i][N-U3',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '(¹)\Í\r/L²3S8•Z	','update','{\"name\": \"Bring vegetables from market\"}','2026-03-22 15:14:17'),(_binary 'I3b3@vƒŠo±CV',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Òı!\Üÿ[HS¿5‘Ê­\0\0','create','{\"name\": \"Task 4\"}','2026-03-22 19:43:18'),(_binary 'K‡şJƒ¬f`v£\ãğ\è',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'Á8b7–@®¢\êC¦Xz0','move','{\"name\": \"Task 1\"}','2026-03-22 13:39:33'),(_binary 'M‹Z7@¬¤Í½\ëM\Ş',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary 'M¡,j\Él@‹´>0\â','create','{\"name\": \"Seed Project\"}','2026-02-17 10:51:06'),(_binary 'P\ç1L’bNW =z\ÇS±\Õ+',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '(¹)\Í\r/L²3S8•Z	','update','{\"name\": \"Bring vegetables from market\"}','2026-03-22 15:14:24'),(_binary 'SS\Ég\ÈñAgğF€¦¾',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '	³m¢\'(O¹´\Å;¨N','move','{\"name\": \"Task 3\"}','2026-03-22 19:30:25'),(_binary 'W\éCÇ­\İKõš\è\"\Ìö]†',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'Á8b7–@®¢\êC¦Xz0','update','{\"name\": \"Task 1\"}','2026-03-22 14:34:00'),(_binary 'Z¡\ìS€™H\î¼\0\àm‘²\ßf',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Ç*‡»m1E~¤\×?\çxHx','move','{\"name\": \"Task 1\"}','2026-03-23 17:05:53'),(_binary '`!~ÈL3ª¬\í~\è(g',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary '\×\ÕbÎG^ŸK¨0pX\0\0','create','{\"name\": \"Job hunt\"}','2026-03-22 18:29:21'),(_binary 'aL\ĞaRII ·cWll©f',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Û\î\Ã\Í\Ë\İJ¸¡n\ÖX9\0\0','create','{\"name\": \"Task 2\"}','2026-03-22 13:35:45'),(_binary 'dE\å\rNL©\'7`xf¹œ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary '¡_w€%wM\ì`|ñ6','update','{\"name\": \"Stella Solution\"}','2026-03-22 18:32:25'),(_binary 'd|Š¤\ĞEº…Òœj\Òÿl',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Ç*‡»m1E~¤\×?\çxHx','update','{\"name\": \"Task 1\"}','2026-03-22 20:31:24'),(_binary 'h\ÃHp7D¡¡ü\Ï\0G',_binary 'ŠB\Ë\röBŒŒh°º.Ä›',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:','create','{\"name\": \"Seed Project\"}','2026-03-22 12:11:31'),(_binary 't\ÕZcZDŸ¤¼©ùö\î\n',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH','move','{\"name\": \"Task 2\"}','2026-03-22 19:40:17'),(_binary '\ï… ó„H_ˆd\Ôòp@™',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Ç*‡»m1E~¤\×?\çxHx','move','{\"name\": \"Task 1\"}','2026-03-23 17:04:51'),(_binary '„~)~{UMª\Ç\0~)',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '	³m¢\'(O¹´\Å;\0\0','create','{\"name\": \"Task 3\"}','2026-03-22 19:10:21'),(_binary '†ò\ï°\ÖWNñ—ğ\è\Ó[Ş„4',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 13:36:02'),(_binary '‡rT\Ñ\Ú\áG–Š®\Å\áÀy\ï7',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'Á8b7–@®¢\êC¦Xz0','update','{\"name\": \"Task 1\"}','2026-03-22 13:35:11'),(_binary 'BeD.ûAy·\0‘ŸR(šA',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\é\Êø2Kş„\íóGOœ\0\0','create','{\"name\": \"Task 3\"}','2026-03-24 02:55:29'),(_binary 'LI‘\ÔN³¦«„»\Ä{\Ü',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 14:27:58'),(_binary '-pPpK}¦\"ªø\r-',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','move','{\"name\": \"Task 3\"}','2026-03-22 13:57:41'),(_binary '“J¿¢ö\İJµ:\æJc\Æ\Æ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\é\Êø2Kş„\íóGOœ\Ú','update','{\"name\": \"Task 3\"}','2026-03-24 04:43:27'),(_binary '”D{‰\éG†’™C³N±',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 13:56:25'),(_binary ' ²B\êBCwrb]\Î',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH','move','{\"name\": \"Task 2\"}','2026-03-23 17:08:42'),(_binary ' \å\\\ØTA\ï‡~½&\Ä\Ä',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary '¡_w€%wM\ì`|\0\0','create','{\"name\": \"Stella Solution\"}','2026-03-22 16:16:41'),(_binary '¡·V\ŞLIÃ£—a\nG7',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '	³m¢\'(O¹´\Å;¨N','update','{\"name\": \"Task 3\"}','2026-03-22 19:30:32'),(_binary 'ª&\ç(\à}Br­\\|Á‹aºB',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Ç*‡»m1E~¤\×?\çxHx','update','{\"name\": \"Task 1\"}','2026-03-23 17:05:27'),(_binary '¯øw›0\ÜNU¼/h-e•.\É',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Û\î\Ã\Í\Ë\İJ¸¡n\ÖX9½U','move','{\"name\": \"Task 2\"}','2026-03-22 13:39:48'),(_binary '°À\"A7¬j˜\Ş\â\Ü',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Û\î\Ã\Í\Ë\İJ¸¡n\ÖX9½U','move','{\"name\": \"Task 2\"}','2026-03-22 15:16:56'),(_binary '³ôÍ¦*‘A¤\ÓN_“>¯',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 14:15:03'),(_binary '´¯+CJ=¦ òf\Ô\Âú',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','move','{\"name\": \"Task 3\"}','2026-03-22 13:55:55'),(_binary 'µSMGBH³¨Œ“4\Ôxı',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 13:56:21'),(_binary '¶‰¡¿µHTöjøÿ0',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '(¹)\Í\r/L²3S8•Z	','update','{\"name\": \"Bring vegetables from market\"}','2026-03-22 15:14:30'),(_binary '¹¥W†\'®K5¬\0\"sE\Ûo°',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\é\Êø2Kş„\íóGOœ\Ú','update','{\"name\": \"Task 3\"}','2026-03-24 04:43:46'),(_binary '½ªNrrEU¢P”¹\Ìy',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '(¹)\Í\r/L²3S8•Z	','update','{\"name\": \"Bring vegetables from market\"}','2026-03-22 15:13:57'),(_binary '¿†¢\00›AŠR†ƒ%',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 14:28:05'),(_binary 'À#ö\ÓZ]G_‡œ‰©¼/',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 13:55:45'),(_binary 'ÀYlşbcOÇ¨œ\é\É*¡„ ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '	³m¢\'(O¹´\Å;¨N','move','{\"name\": \"Task 3\"}','2026-03-22 19:30:59'),(_binary '\Ä`öˆ¸cCŞ‹L¿\è\ê[Eø',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'Á8b7–@®¢\êC¦Xz0','update','{\"name\": \"Task 1\"}','2026-03-22 13:43:20'),(_binary '\Å^¤\än¿F‚’\æ\ØV^¡?',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH','move','{\"name\": \"Task 2\"}','2026-03-22 19:40:14'),(_binary '\ÅpûH\ÅBr³%?œU&Q_',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 14:20:08'),(_binary 'Ç·X?\ÑKùª6F´N\Ô=J',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\0\0','create','{\"name\": \"Task 3\"}','2026-03-22 13:35:57'),(_binary 'Ï™oS+iC<•`­~\ï¼f',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Û\î\Ã\Í\Ë\İJ¸¡n\ÖX9½U','update','{\"name\": \"Task 2\"}','2026-03-22 13:36:04'),(_binary '\Ñ-\Ì4U\æMĞ,¨y\Å^œ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Òı!\Üÿ[HS¿5‘Ê­‚$','update','{\"name\": \"Task 4\"}','2026-03-24 02:55:53'),(_binary '\Ö\ïlô>†A¨£ÿğFÓ§\Ôc',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'Á8b7–@®¢\êC¦X\0\0','create','{\"name\": \"Task 1\"}','2026-03-22 13:22:59'),(_binary '\×>\Ò}\ÒZF!­Z¾¶\Ë`0\é',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary '¡_w€%wM\ì`|ñ6','update','{\"name\": \"Stella Solution\"}','2026-03-22 18:32:17'),(_binary '\Øù°¸§8A\ë3WÀı6¤',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '(¹)\Í\r/L²3S8•\0\0','create','{\"name\": \"Bring vegetables from market\"}','2026-03-22 15:13:52'),(_binary '\Û§-Ÿ¨B€…û£3·ª\0',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','update','{\"name\": \"Task 3\"}','2026-03-22 14:28:10'),(_binary '\İ`À”YOLj‡¹U†\å\Ò',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH','update','{\"name\": \"Task 2\"}','2026-03-23 17:08:39'),(_binary '\ŞmŸB›©L…¡·\ï\äYB\Ã',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH','update','{\"name\": \"Task 2\"}','2026-03-22 20:22:20'),(_binary '\áDi\Í\ÙK¥³y\'›\æ>¬',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary '\×\ÕbÎG^ŸK¨0pXı\'','update','{\"name\": \"Job hunt A\"}','2026-03-22 18:56:21'),(_binary '\áf\ä\æ²mMË¶\Ä\×\àkp',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Òı!\Üÿ[HS¿5‘Ê­‚$','update','{\"name\": \"Task 4\"}','2026-03-22 19:43:34'),(_binary '\î\ŞOŞ‚NC•{vDt³',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '\Ç*‡»m1E~¤\×?\çxH\0\0','create','{\"name\": \"Task 1\"}','2026-03-22 19:05:38'),(_binary 'ğEX§ocC2E[X\Öò\Zü',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'FŠR\æLK‰^®Ü»Ï“','update','{\"name\": \"Create The dashboard page\"}','2026-03-22 13:36:47'),(_binary 'õ NvWC;ˆ£‚i{ƒ4¢',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','project',_binary '¡_w€%wM\ì`|ñ6','update','{\"name\": \"Stella Solution\"}','2026-03-22 18:56:43'),(_binary 'øbu \ÔJK¢Ã¥\ìP­ş',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary '	³m¢\'(O¹´\Å;¨N','move','{\"name\": \"Task 3\"}','2026-03-22 19:30:54'),(_binary 'ı\éOªME¸^”‡6b',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','task',_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH','update','{\"name\": \"Task 2\"}','2026-03-22 20:22:41');
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_keys`
--

DROP TABLE IF EXISTS `api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_keys` (
  `id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `key_hash` varchar(255) NOT NULL,
  `key_prefix` varchar(16) NOT NULL,
  `created_by` binary(16) NOT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_keys_organization_id` (`organization_id`),
  KEY `fk_api_keys_creator` (`created_by`),
  CONSTRAINT `fk_api_keys_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_api_keys_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_keys`
--

LOCK TABLES `api_keys` WRITE;
/*!40000 ALTER TABLE `api_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_fields`
--

DROP TABLE IF EXISTS `custom_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_fields` (
  `id` binary(16) NOT NULL,
  `project_id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `field_type` varchar(50) NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_custom_project` (`project_id`),
  CONSTRAINT `fk_custom_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_fields`
--

LOCK TABLES `custom_fields` WRITE;
/*!40000 ALTER TABLE `custom_fields` DISABLE KEYS */;
INSERT INTO `custom_fields` VALUES (_binary '\â\"q\ìC[£\Ïû\Ò_\Z\r',_binary '\ï\áñ(H\ä»m\Ã#!\Ó','Field1','TEXT',0);
/*!40000 ALTER TABLE `custom_fields` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_verification_tokens`
--

DROP TABLE IF EXISTS `email_verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_verification_tokens` (
  `id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_verification_token` (`token`),
  KEY `idx_email_verification_user` (`user_id`),
  CONSTRAINT `fk_email_verification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_verification_tokens`
--

LOCK TABLES `email_verification_tokens` WRITE;
/*!40000 ALTER TABLE `email_verification_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_verification_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` binary(16) NOT NULL,
  `subscription_id` binary(16) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'UNPAID',
  `issued_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at` timestamp NULL DEFAULT NULL,
  `organization_id` binary(16) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `billing_cycle` varchar(20) DEFAULT NULL,
  `plan_name` varchar(100) DEFAULT NULL,
  `user_count` int DEFAULT '1',
  `razorpay_invoice_id` varchar(255) DEFAULT NULL,
  `due_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_invoice_subscription` (`subscription_id`),
  CONSTRAINT `fk_invoice_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES (_binary 'š´[Á®cH¹‰•vƒtÑ„',_binary '\é½\Å7G«¥•¢¦YXy\è',349.00,'PAID','2026-03-22 21:50:06','2026-03-22 21:50:07',_binary '}A\0vÀñOY©\r–±³\Úö','INR','monthly','Pro',1,'pay_SUQSCmpv6uRb6S',NULL);
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,1739812800000,'CreateOrganizationInvitations1739812800000'),(2,1760000000000,'AddTaskAssigneeIds1760000000000'),(3,1760000001000,'AddTaskSubtasks1760000001000'),(4,1700000000000,'InitDatabaseSchema1700000000000'),(5,1760000002000,'BackfillTaskAssigneeIdsAndSubtasks1760000002000'),(6,1760000003000,'AddTaskTags1760000003000'),(7,1760000004000,'AddUserLastSeenAt1760000004000'),(8,1760000005000,'AddOrganizationLogoUrl1760000005000'),(9,1760000006000,'ChangeOrganizationLogoUrlToMediumtext1760000006000'),(10,1760000007000,'AddOrganizationIsArchived1760000007000'),(11,1760000008000,'AddUserOnboardingCompletedAt1760000008000'),(12,1760000009000,'AddSubscriptionEnforcementTables1760000009000'),(13,1760000010000,'AddSSOConfigAndPlanUpgrade1760000010000'),(14,1760000011000,'AddPlanSlugAndColumns1760000011000'),(15,1760000012000,'AddSubscriptionBillingCycleAndRazorpay1760000012000'),(16,1760000013000,'AddPaymentsRazorpayColumns1760000013000'),(17,1760000014000,'AddEmailVerificationAndPasswordReset1760000014000'),(18,1760000015000,'AddUserGoogleId1760000015000'),(19,1760000016000,'AddUserPhoneAndOtpCodes1760000016000'),(20,1760000017000,'ChangeOrganizationsOwnerToCascade1760000017000'),(21,1760000018000,'UpdateFreePlanMaxProjectsToOne1760000018000'),(22,1760000019000,'EnsurePlanSlugColumn1760000019000'),(23,1760000020000,'AddProjectIconUrl1760000020000');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (_binary 'J\çŠWEªd¿g‹_\'\n',_binary 'ßˆR™vB\éš$³ªKÒ€t','Task assigned: Task 1','Seed Owner assigned you to \"Task 1\" in Job hunt A.',0,'2026-03-23 17:05:31'),(_binary '0\Ü|}Mµ•ÀŸ„,\Şw>',_binary 'z#\Õm|˜O¥6I¶[—','Task assigned: Task 1','Seed Owner assigned you to \"Task 1\" in Marketing Campaign.',0,'2026-03-22 13:43:20'),(_binary 'O\ÄÀ\ä\Ö>OV‰cdMŸË',_binary '%¼\á+\rIõˆ\Ùkıÿ’2','Task assigned: Task 1','Seed Owner assigned you to \"Task 1\" in Job hunt A.',0,'2026-03-22 20:31:24'),(_binary 'T!ˆ>*EŸ•D÷¨\Ìó–',_binary 'Ô’\çLA©²e«‚}\Ã}¶','For User B',NULL,1,'2026-02-17 08:21:43'),(_binary 'g\æ\àD(šºµo\Ô\ìö',_binary '£.z|œJq«–µ+9û–\î','Task assigned: Task 2','Seed Owner assigned you to \"Task 2\" in Job hunt A.',0,'2026-03-22 20:22:20'),(_binary 'vK[,MK¤\çZ\â\ê~_',_binary 'Oš#şµ\ĞOX©\Ä.º\İ^»‘','Task assigned: Task 4','Seed Owner assigned you to \"Task 4\" in Job hunt A.',0,'2026-03-22 20:22:14'),(_binary '’ño“…GlŠõ,)\ë%õ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','Welcome','Seed notification',0,'2026-02-17 10:51:06'),(_binary '•ùÖ…®H€ˆ\ï¨0—¼',_binary '%¼\á+\rIõˆ\Ùkıÿ’2','Task assigned: Task 3','Seed Owner assigned you to \"Task 3\" in Job hunt A.',0,'2026-03-24 04:43:27'),(_binary 'ªr¸FGo¼’ F_Ş†',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','Welcome','Seed notification',1,'2026-03-22 12:11:31');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_invitations`
--

DROP TABLE IF EXISTS `organization_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_invitations` (
  `id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `token` varchar(64) NOT NULL,
  `invited_by` binary(16) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_invitation_token` (`token`),
  KEY `idx_invitation_org_email` (`organization_id`,`email`),
  KEY `fk_invitation_inviter` (`invited_by`),
  CONSTRAINT `fk_invitation_inviter` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_invitation_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_invitations`
--

LOCK TABLES `organization_invitations` WRITE;
/*!40000 ALTER TABLE `organization_invitations` DISABLE KEYS */;
INSERT INTO `organization_invitations` VALUES (_binary '+¶.\êBFØ¦]‰´iKø:',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','6733b6ece1569348abf056bb3641911b2e98d7434c709515c96b6b8337e14222',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:44:47','2026-02-17 16:44:46'),(_binary '.\äµMGµ¨yµ\ÖØ¿',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','6377bd04a745fa9e666e471036065614bc6e459b28dd922d4b998979c1cbf6cf',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:11:06','2026-02-17 16:11:06'),(_binary ' \ÛKyOÅª\í™rƒM\r',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','2aeb5a8d1cd4437a1c7220524958fab43483b38589e554ad78dc97d470d94866',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:41:16','2026-02-17 16:41:16'),(_binary '=€;Ş\ìJ\n¢A+EXPe',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','6cb9d31cd5766dcb5bb579385ab52b28bef38fdab0195e78004057c79ce87f15',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:31:01','2026-02-17 16:31:00'),(_binary '@ª\Ğ;	qF’¶÷ê¦”\Ñx',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.7613@gmail.com','member','1b368ae676552d55f5fb418cad5df0a39577f56622cee0dd0e08379cc81e22fb',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 15:30:46','2026-02-17 15:30:46'),(_binary 'AvÀŸ2CK…&#Œ3ú',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','66081a7ce374903e7be914ac4dc55df0cd67f7614f46e6609c36494b0bb52f51',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:05:49','2026-02-17 16:05:49'),(_binary 'I‚\Ö^cF3ª]\ë\\q@P',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.7613@gmail.com','member','795f279b58ef49fb600b9d001b04b0a8d7b2b6a31fe0716612a8daa87b9824a3',_binary 'z#\Õm|˜O¥6I¶[—','PENDING','2026-02-24 15:51:54','2026-02-17 15:51:54'),(_binary '¤´öJUKC’¡©n°uL',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.7613@gmail.com','member','ac56441596d4eaf516d3083cbc35f173afe25df073b042f91982ee53eee60606',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 15:37:11','2026-02-17 15:37:10'),(_binary '¨—ô?F\ì¿)ôô\İqMW',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.7613@gmail.com','member','f62edcae073e9744fb0808662eb331a8359c17fc56a52dd6a433d4b3b7ff2023',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 15:16:09','2026-02-17 15:14:55'),(_binary '¸¾o3I~Yp…„h¦',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','65197e402ab4e8e0d794ddf39c52e97a43b209a31048317ce65e782cd11231fd',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:20:13','2026-02-17 16:20:13'),(_binary '¼*{ŒMµ·U=\ì\Z\r',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','06eca27dc0f2b2058c08b958da3ad9fc6c8430630cb42bc293d7d1f205a5dc88',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 15:57:49','2026-02-17 15:57:48'),(_binary '½¬Q\Ğe1Nœ•sQ¢5õ\Ñü',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','d84f96669ce8d89909fb748cb7f2e173e25a51ae7a4b31a9e8c54af8ac78e9b4',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:26:31','2026-02-17 16:26:30'),(_binary '\Ì>§¥UƒH$­n-¾?r—',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','c16bdba239a03ef656e22659c3a351f83414a24847f1a771124132bd2663d6bb',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:16:38','2026-02-17 16:16:37'),(_binary '\ĞF\Ø$‹Ÿ@ƒo6†JÍ¹',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.76131@gmail.com','member','dfab279e6ce8785568c81c531f497ebfb2c76b296a843873f8207b5610ba07ef',_binary 'z#\Õm|˜O¥6I¶[—','PENDING','2026-02-24 15:16:27','2026-02-17 15:16:26'),(_binary 'ÚŠò¾¹\ÛF\ç\Â –<X',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','16cbf33431d8a574bddf528235a7fdbf69e8c9046e616b50e3a5afd1a2de6ffb',_binary 'z#\Õm|˜O¥6I¶[—','ACCEPTED','2026-02-24 16:51:04','2026-02-17 16:51:03'),(_binary '\él%4J\í›\îb‡\Ñøx',_binary 'Uš·@wMøƒA°°qF\Ñ','pankaj.kumar.119eng@gmail.com','member','a28a5890d4456f8ae765f48a38d7e5e3a4d9c45e19ba837c7940bb093d4b5855',_binary 'z#\Õm|˜O¥6I¶[—','CANCELLED','2026-02-24 16:19:25','2026-02-17 16:19:25');
/*!40000 ALTER TABLE `organization_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_members`
--

DROP TABLE IF EXISTS `organization_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_members` (
  `id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `role` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'ACTIVE',
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_org_user` (`organization_id`,`user_id`),
  KEY `fk_org_member_user` (`user_id`),
  KEY `idx_org_members_org` (`organization_id`),
  CONSTRAINT `fk_org_member_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_org_member_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_members`
--

LOCK TABLES `organization_members` WRITE;
/*!40000 ALTER TABLE `organization_members` DISABLE KEYS */;
INSERT INTO `organization_members` VALUES (_binary '§MôFM¯\àÑ‚\Å†\Ä',_binary '}A\0vÀñOY©\r–±³\Úö',_binary ')»¹h?øAô±\ØX$g‰','member','ACTIVE','2026-03-22 20:21:18'),(_binary '\å\Ë,(C½‚q\ÈBY®K',_binary '’qG¾\àD§œ\ë4·5[ˆj',_binary '¬H»…´Dúª=œ)v>\ê¿','admin','ACTIVE','2026-02-17 08:21:37'),(_binary '49ŠùD´\Ãt\îFñ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'HMö9\ØOFºV¹[n¹€','member','ACTIVE','2026-03-22 20:21:18'),(_binary 'F\Ù\ÄfEıŠ!\n\"“=(',_binary '\Ñğ\í\ZB’«\ÊL´Eö“',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','owner','ACTIVE','2026-02-17 10:58:36'),(_binary '•‚s³¥AU\ï\à0DM\à',_binary '\n\Ë\Ê1›*F9¢?\Üf9³9',_binary 'Ô’\çLA©²e«‚}\Ã}¶','admin','ACTIVE','2026-02-17 08:21:43'),(_binary '%Hª\ã˜B˜²·\â=\'‘õ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary '%¼\á+\rIõˆ\Ùkıÿ’2','member','ACTIVE','2026-03-22 20:21:18'),(_binary ';kÆ•B«A³Yz\ît¨\Âö',_binary '}A\0vÀñOY©\r–±³\Úö',_binary '\ÂR\ÚÀG\ï…Qü©N†9','member','ACTIVE','2026-03-22 20:21:18'),(_binary '< ½_µG…±°8]ñz',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'z#\Õm|˜O¥6I¶[—','admin','ACTIVE','2026-02-17 15:13:21'),(_binary 'E!jl\İ9I$­ù$­,%',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','owner','ACTIVE','2026-02-17 10:51:05'),(_binary 'I¤5 \ÂN»hº\àGú',_binary '}A\0vÀñOY©\r–±³\Úö',_binary '®;\Ê\âj»C]¹®bE\nq°\ä','member','ACTIVE','2026-03-22 20:21:18'),(_binary ']İ®\×2ğOÔ·\"£ \ÕK\Ğ',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'Oš#şµ\ĞOX©\Ä.º\İ^»‘','member','ACTIVE','2026-03-22 20:21:18'),(_binary 'eE÷“\ÆBŸ´óORMk©',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'dB¤\rÆ¡N•š\åq2\à…\Ì','member','ACTIVE','2026-03-22 20:21:18'),(_binary 'w\Ís\ÆG!„ùşS0r’',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','owner','ACTIVE','2026-03-22 15:35:48'),(_binary '€¬v0’—Ov²J,›“\ê™',_binary 'ŠB\Ë\röBŒŒh°º.Ä›',_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','member','ACTIVE','2026-03-22 12:11:31'),(_binary '’yœcµH¡¬”8\ïLş',_binary 'ŠB\Ë\röBŒŒh°º.Ä›',_binary 'z#\Õm|˜O¥6I¶[—','admin','ACTIVE','2026-03-22 12:11:31'),(_binary '\Úu€oœM¦ˆ`ˆÍ­l',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','member','ACTIVE','2026-02-17 10:51:05'),(_binary '\Ğ\ê\êƒM˜¥r©ÀŠ\è\Ç÷',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary '}ó‘ı\ÜK~ˆ¹OVÏ­ük','member','ACTIVE','2026-02-17 16:51:29'),(_binary '\Ù|7b¶­O¼\æùºm!³_',_binary '}A\0vÀñOY©\r–±³\Úö',_binary 'ßˆR™vB\éš$³ªKÒ€t','member','ACTIVE','2026-03-22 20:21:18'),(_binary '\áu\'FCŸ®\Òr¼%g\"',_binary '}A\0vÀñOY©\r–±³\Úö',_binary '£.z|œJq«–µ+9û–\î','member','ACTIVE','2026-03-22 20:21:18'),(_binary '\ëÁŸ,‡«J@‰6°\îR¼ep',_binary 'ŠB\Ë\röBŒŒh°º.Ä›',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','owner','ACTIVE','2026-03-22 12:11:31'),(_binary 'õ\n(]1C¿ˆ\×ğqú\ä¸',_binary '}A\0vÀñOY©\r–±³\Úö',_binary '\é\ãp³On†9şğAú\ä','member','ACTIVE','2026-03-22 20:21:18'),(_binary 'ø7]u\ÍO«š\îo\ÚZJoó',_binary '±Ç¨\çZG>¥D–D´]¾\"',_binary 'œ¥ƒ\Ø$J¤°;„OL\èen','admin','ACTIVE','2026-02-17 08:21:43');
/*!40000 ALTER TABLE `organization_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` binary(16) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `logo_url` mediumtext,
  `owner_id` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_organizations_owner` (`owner_id`),
  CONSTRAINT `fk_organizations_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizations`
--

LOCK TABLES `organizations` WRITE;
/*!40000 ALTER TABLE `organizations` DISABLE KEYS */;
INSERT INTO `organizations` VALUES (_binary '±Ç¨\çZG>¥D–D´]¾\"','Org A','org-a-security-1771316503972',NULL,_binary 'œ¥ƒ\Ø$J¤°;„OL\èen','2026-02-17 08:21:43','2026-02-17 08:21:43',0),(_binary '\n\Ë\Ê1›*F9¢?\Üf9³9','Org B','org-b-security-1771316503972',NULL,_binary 'Ô’\çLA©²e«‚}\Ã}¶','2026-02-17 08:21:43','2026-02-17 08:21:43',0),(_binary 'Uš·@wMøƒA°°qF\Ñ','Seed Org','seed-org-1771325465982','data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23475569%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2364748b%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20font-size%3D%2230%22%3E%F0%9F%8E%AF%3C%2Ftext%3E%3C%2Fsvg%3E',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 10:51:05','2026-03-22 20:14:56',0),(_binary '}A\0vÀñOY©\r–±³\Úö','Personal Solutions','personal-solutions','data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%234f46e5%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23818cf8%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20font-size%3D%2230%22%3E%F0%9F%92%A1%3C%2Ftext%3E%3C%2Fsvg%3E',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-03-22 15:35:48','2026-03-22 20:15:07',0),(_binary 'ŠB\Ë\röBŒŒh°º.Ä›','mini HR 360','seed-org-1774181491144','data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%234f46e5%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23818cf8%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20font-size%3D%2230%22%3E%F0%9F%92%A1%3C%2Ftext%3E%3C%2Fsvg%3E',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-03-22 12:11:31','2026-03-22 15:52:48',1),(_binary '’qG¾\àD§œ\ë4·5[ˆj','Throttle Org','throttle-org-1771316497594',NULL,_binary '¬H»…´Dúª=œ)v>\ê¿','2026-02-17 08:21:37','2026-02-17 08:21:37',0),(_binary '™Yø\r\ç*L	®§Ì p¼\0','Seecog Softwares private limited','seecog',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 10:53:23','2026-02-17 10:53:23',0),(_binary '\Ñğ\í\ZB’«\ÊL´Eö“','Hcl Technologies','hcl','data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%232563eb%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2306b6d4%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20font-size%3D%2230%22%3E%F0%9F%9A%80%3C%2Ftext%3E%3C%2Fsvg%3E',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 10:58:36','2026-03-22 15:53:05',0),(_binary '\è\Øû\ëBjŠ-\ÖO8\Æf ','Seecog softwares private limited','seecog-softwares',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 10:52:33','2026-02-17 10:52:33',0);
/*!40000 ALTER TABLE `organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_codes`
--

DROP TABLE IF EXISTS `otp_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_codes` (
  `id` binary(16) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `code` varchar(6) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_phone` (`phone`),
  KEY `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_codes`
--

LOCK TABLES `otp_codes` WRITE;
/*!40000 ALTER TABLE `otp_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_reset_token` (`token`),
  KEY `idx_password_reset_user` (`user_id`),
  CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` binary(16) NOT NULL,
  `invoice_id` binary(16) DEFAULT NULL,
  `payment_gateway` varchar(100) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `subscription_id` binary(16) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `razorpay_payment_id` varchar(255) DEFAULT NULL,
  `razorpay_order_id` varchar(255) DEFAULT NULL,
  `razorpay_signature` varchar(500) DEFAULT NULL,
  `method` varchar(20) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_payments_subscription` (`subscription_id`),
  KEY `fk_payments_invoice` (`invoice_id`),
  CONSTRAINT `fk_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price_per_user` decimal(10,2) DEFAULT NULL,
  `billing_cycle` varchar(50) NOT NULL,
  `max_projects` int DEFAULT NULL,
  `max_members` int DEFAULT NULL,
  `features` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `max_storage_mb` int DEFAULT NULL,
  `max_api_keys` int DEFAULT NULL,
  `slug` varchar(50) NOT NULL,
  `price_monthly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `price_yearly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `max_users` int DEFAULT NULL,
  `storage_limit_gb` int DEFAULT NULL,
  `automation_limit` int DEFAULT NULL,
  `integration_limit` int DEFAULT NULL,
  `api_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `sso_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `audit_logs_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `custom_workflows` tinyint(1) NOT NULL DEFAULT '0',
  `advanced_reporting` tinyint(1) NOT NULL DEFAULT '0',
  `time_tracking` tinyint(1) NOT NULL DEFAULT '0',
  `priority_support` tinyint(1) NOT NULL DEFAULT '0',
  `sla_uptime` varchar(10) DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_popular` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_plans_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (_binary 'h›H¹?J\ì”]„\Çò³','Starter',NULL,'monthly',10,NULL,'{\"apiAccess\": true, \"automation\": true, \"scrumBoard\": false, \"kanbanBoard\": true, \"customFields\": true, \"timeTracking\": false, \"basicReporting\": true, \"roleBasedPermissions\": true}',1,'2026-03-22 12:11:31',NULL,5,'starter',5.00,50.00,'INR',10,5,50,5,1,0,0,1,0,0,0,NULL,2,0),(_binary '˜b\0^‹¡B“˜`Ilk','Free',NULL,'monthly',1,5,'{\"scrumBoard\": false, \"kanbanBoard\": true, \"customFields\": false, \"timeTracking\": false, \"basicReporting\": true, \"roleBasedPermissions\": false}',1,'2026-02-17 10:51:06',NULL,0,'free',0.00,0.00,'INR',5,5,0,0,0,0,0,0,0,0,0,NULL,1,0),(_binary 'š%“\ç\Å\ÈCJ¿£t¾ªH¬%','Enterprise',25.00,'monthly',NULL,NULL,'{\"sso\": true, \"apiAccess\": true, \"auditLogs\": true, \"automation\": true, \"dataExport\": true, \"scrumBoard\": true, \"kanbanBoard\": true, \"advancedRbac\": true, \"customFields\": true, \"timeTracking\": true, \"basicReporting\": true, \"customSecurity\": true, \"dedicatedManager\": true, \"roleBasedPermissions\": true}',1,'2026-02-17 10:51:06',NULL,NULL,'enterprise',799.00,7999.00,'INR',NULL,NULL,NULL,NULL,1,1,1,1,1,1,1,'99.9%',4,0),(_binary '\áˆ÷O8Nœ¬¢Rªh\Èl','Pro',10.00,'monthly',NULL,50,'{\"apiAccess\": true, \"automation\": true, \"scrumBoard\": true, \"kanbanBoard\": true, \"customFields\": true, \"timeTracking\": true, \"basicReporting\": true, \"roleBasedPermissions\": true}',1,'2026-02-17 10:51:06',NULL,10,'pro',349.00,3499.00,'INR',NULL,100,500,10,1,0,0,1,1,1,0,NULL,3,1);
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_members`
--

DROP TABLE IF EXISTS `project_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_members` (
  `id` binary(16) NOT NULL,
  `project_id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_user` (`project_id`,`user_id`),
  KEY `fk_project_member_user` (`user_id`),
  CONSTRAINT `fk_project_member_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_member_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_members`
--

LOCK TABLES `project_members` WRITE;
/*!40000 ALTER TABLE `project_members` DISABLE KEYS */;
INSERT INTO `project_members` VALUES (_binary '\"\Õ#rı\ÒAx¤¶n¸\ĞHŠ',_binary 'M¡,j\Él@‹´>0\â',_binary '}ó‘ı\ÜK~ˆ¹OVÏ­ük','CONTRIBUTOR'),(_binary '&\ÏÚˆEH•!¶\É\ïk²u',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:',_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','VIEWER'),(_binary 'Akx\ÙoHë„›?m·™b',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:',_binary 'z#\Õm|˜O¥6I¶[—','ADMIN'),(_binary '„wW²Gz¢_³Ô«4»',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','VIEWER'),(_binary ' \Íb\Ê\Ó\ØBÓ…8\å•i–±',_binary 'M¡,j\Él@‹´>0\â',_binary 'z#\Õm|˜O¥6I¶[—','ADMIN'),(_binary '\Åa‚ñ\Ş\ÕK„‡8z·}\ÊGf',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','CONTRIBUTOR'),(_binary '\è\ì`;]jI<´ıDPû¥\Å',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'z#\Õm|˜O¥6I¶[—','ADMIN'),(_binary 'üw\ÎH…Lt›I’Ö§\Ï±',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','ADMIN');
/*!40000 ALTER TABLE `project_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text,
  `icon_url` mediumtext,
  `visibility` varchar(50) NOT NULL DEFAULT 'PRIVATE',
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_org` (`id`,`organization_id`),
  KEY `fk_project_org` (`organization_id`),
  KEY `fk_project_creator` (`created_by`),
  CONSTRAINT `fk_project_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_project_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (_binary '+;‡\Ç^MøŠ§™™%-\æI',_binary 'Uš·@wMøƒA°°qF\Ñ','Marketing Campaign','Plan campaigns, content, and launches',NULL,'PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-18 16:05:41','2026-02-18 16:05:41'),(_binary 'M¡,j\Él@‹´>0\â',_binary 'Uš·@wMøƒA°°qF\Ñ','Seed Project','Created by seed',NULL,'PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 10:51:06','2026-02-17 10:51:06'),(_binary '`L\à\î_NH£œ~H–\ÉP~K',_binary '’qG¾\àD§œ\ë4·5[ˆj','Throttle Project',NULL,NULL,'PRIVATE',0,_binary '¬H»…´Dúª=œ)v>\ê¿','2026-02-17 08:21:37','2026-02-17 08:21:37'),(_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:',_binary 'ŠB\Ë\röBŒŒh°º.Ä›','Seed Project','Created by seed',NULL,'PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-03-22 12:11:31','2026-03-22 12:11:31'),(_binary '\×\ÕbÎG^ŸK¨0pXı\'',_binary '}A\0vÀñOY©\r–±³\Úö','Job hunt A','<p>job hunt tasks</p>','data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22hsl(0%2C%2072%25%2C%2042%25)%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22hsl(36%2C%2068%25%2C%2052%25)%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20font-size%3D%2228%22%3E%F0%9F%8F%86%3C%2Ftext%3E%3C%2Fsvg%3E','PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-03-22 18:29:21','2026-03-22 18:56:21'),(_binary '™<[s\ë@\Z«Em‹t%‚',_binary '\n\Ë\Ê1›*F9¢?\Üf9³9','Project B',NULL,NULL,'PRIVATE',0,_binary 'Ô’\çLA©²e«‚}\Ã}¶','2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','Project 1','project 1 des',NULL,'PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 11:13:36','2026-02-17 11:13:36'),(_binary '¡_w€%wM\ì`|ñ6',_binary '}A\0vÀñOY©\r–±³\Úö','Stella Solution','<p>Track features, bugs, and sprints</p>','data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22hsl(10%2C%2072%25%2C%2042%25)%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22hsl(46%2C%2068%25%2C%2052%25)%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22url(%23g)%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2240%22%20text-anchor%3D%22middle%22%20font-size%3D%2228%22%3E%F0%9F%8D%80%3C%2Ftext%3E%3C%2Fsvg%3E','PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-03-22 16:16:41','2026-03-22 18:56:43'),(_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','mini crm tool','mini crm tool description',NULL,'PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 12:09:15','2026-02-17 12:09:15'),(_binary '¾Q&\ÂHãª±Lw{9',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','Mini HR 360','Mini HR 360 description',NULL,'PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 12:50:50','2026-02-17 12:50:50'),(_binary '\ï\áñ(H\ä»m\Ã#!\Ó',_binary '±Ç¨\çZG>¥D–D´]¾\"','Project A',NULL,NULL,'PRIVATE',0,_binary 'œ¥ƒ\Ø$J¤°;„OL\èen','2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary 'õVó\Æ\è-Dj­B\Î\"›\Å^¦',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','Mini Crm 360','Mini Crm 360 description',NULL,'PRIVATE',0,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-02-17 13:10:13','2026-02-17 13:10:13');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sprints`
--

DROP TABLE IF EXISTS `sprints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sprints` (
  `id` binary(16) NOT NULL,
  `project_id` binary(16) NOT NULL,
  `name` varchar(150) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PLANNED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sprints_project_status` (`project_id`,`status`),
  CONSTRAINT `fk_sprint_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sprints`
--

LOCK TABLES `sprints` WRITE;
/*!40000 ALTER TABLE `sprints` DISABLE KEYS */;
INSERT INTO `sprints` VALUES (_binary '«8P˜+7Fñ«—Cù6ò,ı',_binary '\ï\áñ(H\ä»m\Ã#!\Ó','Sprint 1',NULL,NULL,'PLANNED','2026-02-17 08:21:43'),(_binary '½\î#v@\â„eƒ¢AU\Ş',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:','Sprint 1',NULL,NULL,'PLANNED','2026-03-22 12:11:31'),(_binary '\ä\Ó: ó‹O\ZŒÌ\Ì6\èh',_binary 'M¡,j\Él@‹´>0\â','Sprint 1',NULL,NULL,'PLANNED','2026-02-17 10:51:06');
/*!40000 ALTER TABLE `sprints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sso_configs`
--

DROP TABLE IF EXISTS `sso_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sso_configs` (
  `id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `provider` varchar(20) NOT NULL COMMENT 'SAML or OIDC',
  `label` varchar(150) DEFAULT NULL,
  `issuer_url` text,
  `sso_url` text,
  `client_id` varchar(255) DEFAULT NULL,
  `client_secret` varchar(512) DEFAULT NULL,
  `certificate` text,
  `metadata_url` text,
  `domains` varchar(500) DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sso_configs_organization_id` (`organization_id`),
  CONSTRAINT `fk_sso_configs_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sso_configs`
--

LOCK TABLES `sso_configs` WRITE;
/*!40000 ALTER TABLE `sso_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `sso_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `plan_id` binary(16) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'TRIAL',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `trial_ends_at` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `billing_cycle` varchar(20) NOT NULL DEFAULT 'monthly',
  `razorpay_subscription_id` varchar(255) DEFAULT NULL,
  `razorpay_customer_id` varchar(255) DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_subscription_org` (`organization_id`),
  KEY `fk_subscription_plan` (`plan_id`),
  CONSTRAINT `fk_subscription_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subscription_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES (_binary '\'Â„Y\ÉG‹€vƒú’g',_binary 'Uš·@wMøƒA°°qF\Ñ',_binary '˜b\0^‹¡B“˜`Ilk','ACTIVE','2026-02-17',NULL,'2026-03-03','2026-02-17 10:51:06','monthly',NULL,NULL,NULL,'2026-03-09 09:58:20'),(_binary 'a\ëy?-AB¢\\ª©±%D9',_binary 'ŠB\Ë\röBŒŒh°º.Ä›',_binary '˜b\0^‹¡B“˜`Ilk','ACTIVE','2026-03-22',NULL,'2026-04-05','2026-03-22 12:11:31','monthly',NULL,NULL,NULL,'2026-03-22 12:11:31'),(_binary '\é½\Å7G«¥•¢¦YXy\è',_binary '}A\0vÀñOY©\r–±³\Úö',_binary '\áˆ÷O8Nœ¬¢Rªh\Èl','ACTIVE','2026-03-23','2026-04-23',NULL,'2026-03-22 21:50:06','monthly','pay_SUQSCmpv6uRb6S',NULL,NULL,'2026-03-22 21:50:06');
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_attachments`
--

DROP TABLE IF EXISTS `task_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_attachments` (
  `id` binary(16) NOT NULL,
  `task_id` binary(16) NOT NULL,
  `file_url` text NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `uploaded_by` binary(16) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `file_size_bytes` bigint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_attachment_task` (`task_id`),
  KEY `fk_attachment_user` (`uploaded_by`),
  CONSTRAINT `fk_attachment_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attachment_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_attachments`
--

LOCK TABLES `task_attachments` WRITE;
/*!40000 ALTER TABLE `task_attachments` DISABLE KEYS */;
INSERT INTO `task_attachments` VALUES (_binary '¸§·¬S@i˜I“;\Ì$ó',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB','task-attachments/ec8199d4-e642-4d28-b882-6ff621b6c642/a057bd36-b557-48b8-a3e7-3c9da2be7c90-in.gov.uidai-ADHAR-4dba85d64808d651985c3e82eced3a7e.pdf','in.gov.uidai-ADHAR-4dba85d64808d651985c3e82eced3a7e.pdf',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-03-22 13:56:04',563645),(_binary '¾\ì\â§ø\ßH\ìšÊ1\ÇN',_binary '(¹)\Í\r/L²3S8•Z	','task-attachments/28b929cd-0d2f-4c0b-b233-533895075a09/3e9750c4-3320-40c3-8b8a-207b516888a6-in.gov.uidai-ADHAR-4dba85d64808d651985c3e82eced3a7e__1_.pdf','in.gov.uidai-ADHAR-4dba85d64808d651985c3e82eced3a7e (1).pdf',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','2026-03-22 15:14:48',563645);
/*!40000 ALTER TABLE `task_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_comments`
--

DROP TABLE IF EXISTS `task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_comments` (
  `id` binary(16) NOT NULL,
  `task_id` binary(16) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_comment_user` (`user_id`),
  KEY `idx_comments_task` (`task_id`),
  CONSTRAINT `fk_comment_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_comments`
--

LOCK TABLES `task_comments` WRITE;
/*!40000 ALTER TABLE `task_comments` DISABLE KEYS */;
INSERT INTO `task_comments` VALUES (_binary '˜õ‹9\Â\à@Æ‹\ŞM|\í3(—',_binary '(¹)\Í\r/L²3S8•Z	',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','hbhk','2026-03-22 15:14:43'),(_binary '\Â\Òl@1O$¦Uÿß.',_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','comment 1','2026-03-22 13:38:13');
/*!40000 ALTER TABLE `task_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_custom_field_values`
--

DROP TABLE IF EXISTS `task_custom_field_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_custom_field_values` (
  `id` binary(16) NOT NULL,
  `task_id` binary(16) NOT NULL,
  `custom_field_id` binary(16) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_field` (`task_id`,`custom_field_id`),
  KEY `fk_task_cf_field` (`custom_field_id`),
  CONSTRAINT `fk_task_cf_field` FOREIGN KEY (`custom_field_id`) REFERENCES `custom_fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_cf_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_custom_field_values`
--

LOCK TABLES `task_custom_field_values` WRITE;
/*!40000 ALTER TABLE `task_custom_field_values` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_custom_field_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` binary(16) NOT NULL,
  `project_id` binary(16) NOT NULL,
  `organization_id` binary(16) NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text,
  `status_id` binary(16) DEFAULT NULL,
  `priority` varchar(50) NOT NULL DEFAULT 'MEDIUM',
  `assignee_id` binary(16) DEFAULT NULL,
  `assignee_ids` text,
  `subtasks` text,
  `reporter_id` binary(16) NOT NULL,
  `parent_task_id` binary(16) DEFAULT NULL,
  `story_points` int DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `estimated_minutes` int DEFAULT NULL,
  `logged_minutes` int NOT NULL DEFAULT '0',
  `sprint_id` binary(16) DEFAULT NULL,
  `tags` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_project_org` (`project_id`,`organization_id`,`id`),
  KEY `fk_task_status` (`status_id`),
  KEY `fk_task_assignee` (`assignee_id`),
  KEY `fk_task_reporter` (`reporter_id`),
  KEY `fk_task_parent` (`parent_task_id`),
  KEY `idx_tasks_project_status_assignee` (`project_id`,`status_id`,`assignee_id`),
  KEY `idx_tasks_project_created` (`project_id`,`created_at`),
  KEY `idx_tasks_sprint` (`sprint_id`),
  CONSTRAINT `fk_task_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_task_parent` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `fk_task_project_org` FOREIGN KEY (`project_id`, `organization_id`) REFERENCES `projects` (`id`, `organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_task_sprint` FOREIGN KEY (`sprint_id`) REFERENCES `sprints` (`id`),
  CONSTRAINT `fk_task_status` FOREIGN KEY (`status_id`) REFERENCES `workflow_statuses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (_binary 'FŠR\æLK‰^®Ü»Ï“',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','Create The dashboard page','Create The dashboard page with proper ui',_binary '0ô\\˜4¹DW•	Fè¥','HIGH',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 12:10:31','2026-03-22 13:36:47'),(_binary '2«\nöGeŒ¥\Ûù­úK\Ê',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','ddd','ddd',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 11:50:17','2026-02-17 11:50:17'),(_binary '	³m¢\'(O¹´\Å;¨N',_binary '\×\ÕbÎG^ŸK¨0pXı\'',_binary '}A\0vÀñOY©\r–±³\Úö','Task 3',NULL,_binary 'I\Ä JO‘³\rğk…«\Ë','MEDIUM',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 19:10:21','2026-03-22 19:30:59'),(_binary '\é\Êø2Kş„\íóGOœ\Ú',_binary '\×\ÕbÎG^ŸK¨0pXı\'',_binary '}A\0vÀñOY©\r–±³\Úö','Task 3',NULL,NULL,'MEDIUM',_binary '%¼\á+\rIõˆ\Ùkıÿ’2','[\"25bce11c-2b0d-49f5-88d9-6bfdff923281\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,'2026-03-24',NULL,0,NULL,NULL,'2026-03-24 02:55:29','2026-03-24 04:43:46'),(_binary '&[Ú‹R#IÉš<)¢	n¡',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','Take vegetables from market','Take vegetables from market alu, govi etc',NULL,'HIGH',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 11:48:09','2026-02-17 11:48:09'),(_binary '(¹)\Í\r/L²3S8•Z	',_binary '+;‡\Ç^MøŠ§™™%-\æI',_binary 'Uš·@wMøƒA°°qF\Ñ','Bring vegetables from market','<p>Bachchan was born in&nbsp;<a title=\"Prayagraj\" href=\"https://en.wikipedia.org/wiki/Prayagraj\">Allahabad</a>&nbsp;(now Prayagraj), and he was educated at&nbsp;<a title=\"Sherwood College\" href=\"https://en.wikipedia.org/wiki/Sherwood_College\">Sherwood College</a>,&nbsp;<a title=\"Nainital\" href=\"https://en.wikipedia.org/wiki/Nainital\">Nainital</a>,&nbsp;<a title=\"Uttarakhand\" href=\"https://en.wikipedia.org/wiki/Uttarakhand\">Uttarakhand</a>&nbsp;and&nbsp;<a title=\"Kirori Mal College\" href=\"https://en.wikipedia.org/wiki/Kirori_Mal_College\">Kirori Mal College</a>,&nbsp;<a class=\"mw-redirect\" title=\"University of Delhi\" href=\"https://en.wikipedia.org/wiki/University_of_Delhi\">University of Delhi</a>. His film career started in 1969 as a voice narrator in&nbsp;<a title=\"Mrinal Sen\" href=\"https://en.wikipedia.org/wiki/Mrinal_Sen\">Mrinal Sen</a>\'s film&nbsp;<em><a title=\"Bhuvan Shome\" href=\"https://en.wikipedia.org/wiki/Bhuvan_Shome\">Bhuvan Shome</a></em>, followed by work in early films such as&nbsp;<em><a title=\"Anand (1971 film)\" href=\"https://en.wikipedia.org/wiki/Anand_(1971_film)\">Anand</a></em>&nbsp;and&nbsp;<em><a title=\"Roti Kapada Aur Makaan\" href=\"https://en.wikipedia.org/wiki/Roti_Kapada_Aur_Makaan\">Roti Kapada Aur Makaan</a></em>. He achieved greater stardom in later years; beginning with&nbsp;<em><a title=\"Zanjeer (1973 film)\" href=\"https://en.wikipedia.org/wiki/Zanjeer_(1973_film)\">Zanjeer</a></em>,&nbsp;<em><a title=\"Deewaar\" href=\"https://en.wikipedia.org/wiki/Deewaar\">Deewaar</a></em>, and&nbsp;<em><a title=\"Sholay\" href=\"https://en.wikipedia.org/wiki/Sholay\">Sholay</a></em>&nbsp;that he embodied the \"<a title=\"Angry Young Men (miniseries)\" href=\"https://en.wikipedia.org/wiki/Angry_Young_Men_(miniseries)\"><em>angry young man</em></a>\" in their&nbsp;<a title=\"Hindi cinema\" href=\"https://en.wikipedia.org/wiki/Hindi_cinema\">Hindi films</a>&nbsp;of the 1970s-1980s,<sup id=\"cite_ref-12\" class=\"reference\"><a href=\"https://en.wikipedia.org/wiki/Amitabh_Bachchan#cite_note-12\"><span class=\"cite-bracket\">[</span>11<span class=\"cite-bracket\">]</span></a></sup><sup id=\"cite_ref-13\" class=\"reference\"><a href=\"https://en.wikipedia.org/wiki/Amitabh_Bachchan#cite_note-13\"><span class=\"cite-bracket\">[</span>12<span class=\"cite-bracket\">]</span></a></sup>&nbsp;He consistently starred in the highest grossings of the year, includes&nbsp;<em><a title=\"Kabhi Kabhie\" href=\"https://en.wikipedia.org/wiki/Kabhi_Kabhie\">Kabhi Kabhie</a></em>,&nbsp;<em><a title=\"Hera Pheri (1976 film)\" href=\"https://en.wikipedia.org/wiki/Hera_Pheri_(1976_film)\">Hera Pheri</a></em>,&nbsp;<em><a title=\"Amar Akbar Anthony\" href=\"https://en.wikipedia.org/wiki/Amar_Akbar_Anthony\">Amar Akbar Anthony</a></em>,&nbsp;<em><a title=\"Don (1978 film)\" href=\"https://en.wikipedia.org/wiki/Don_(1978_film)\">Don</a></em>,&nbsp;<em><a title=\"Trishul (film)\" href=\"https://en.wikipedia.org/wiki/Trishul_(film)\">Trishul</a></em>,&nbsp;<em><a title=\"Muqaddar Ka Sikandar\" href=\"https://en.wikipedia.org/wiki/Muqaddar_Ka_Sikandar\">Muqaddar Ka Sikandar</a></em>,&nbsp;<em><a title=\"Kaala Patthar\" href=\"https://en.wikipedia.org/wiki/Kaala_Patthar\">Kaala Patthar</a></em>,&nbsp;<em><a title=\"Dostana (1980 film)\" href=\"https://en.wikipedia.org/wiki/Dostana_(1980_film)\">Dostana</a></em>,&nbsp;<em><a title=\"Laawaris (1981 film)\" href=\"https://en.wikipedia.org/wiki/Laawaris_(1981_film)\">Laawaris (1981 film)</a></em>,&nbsp;<em><a title=\"Coolie (1983 Hindi film)\" href=\"https://en.wikipedia.org/wiki/Coolie_(1983_Hindi_film)\">Coolie</a></em>&nbsp;and&nbsp;<em><a title=\"Mard (1985 film)\" href=\"https://en.wikipedia.org/wiki/Mard_(1985_film)\">Mard</a></em>.<sup id=\"cite_ref-14\" class=\"reference\"><a href=\"https://en.wikipedia.org/wiki/Amitabh_Bachchan#cite_note-14\"><span class=\"cite-bracket\">[</span>13<span class=\"cite-bracket\">]</span></a></sup><sup id=\"cite_ref-15\" class=\"reference\"><a href=\"https://en.wikipedia.org/wiki/Amitabh_Bachchan#cite_note-15\"><span class=\"cite-bracket\">[</span>14<span class=\"cite-bracket\">]</span></a></sup>&nbsp;Bachchan was voted the \"greatest star of stage or screen\" in the&nbsp;<a title=\"BBC\" href=\"https://en.wikipedia.org/wiki/BBC\">BBC</a>&nbsp;<em>Your Millennium</em>&nbsp;online users poll in 1999.<sup id=\"cite_ref-BBC_News_16-0\" class=\"reference\"><a href=\"https://en.wikipedia.org/wiki/Amitabh_Bachchan#cite_note-BBC_News-16\"><span class=\"cite-bracket\">[</span>15<span class=\"cite-bracket\">]</span></a></sup>&nbsp;In October 2003,&nbsp;<em><a title=\"Time (magazine)\" href=\"https://en.wikipedia.org/wiki/Time_(magazine)\">Time</a></em>&nbsp;magazine said he is the undisputed godfather of Bollywood.<sup id=\"cite_ref-Perry_17-0\" class=\"reference\"><a href=\"https://en.wikipedia.org/wiki/Amitabh_Bachchan#cite_note-Perry-17\"><span class=\"cite-bracket\">[</span>16<span class=\"cite-bracket\">]</span></a></sup></p>',NULL,'MEDIUM',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]','[{\"id\":\"208eefc3-28e5-45e6-be12-6c6db3981550\",\"title\":\"Sub task 1\",\"completed\":false,\"dueDate\":\"2026-03-26\",\"priority\":\"LOW\"},{\"id\":\"e9393790-01df-4be0-8b43-2f54b73b8071\",\"title\":\"sub task 2\",\"completed\":false,\"priority\":\"MEDIUM\"}]',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 15:13:52','2026-03-22 15:14:37'),(_binary '(ö%4J@‡R*ªš',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','Task 11','Task 11 Description',_binary '0ô\\˜4¹DW•	Fè¥','CRITICAL',_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','[\"467892db-5e69-4c2c-830d-8e2d9162d2b5\"]',NULL,_binary 'z#\Õm|˜O¥6I¶[—',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-18 02:52:15','2026-02-18 16:00:49'),(_binary 'LG\âÃ¥\ĞL]˜\â¡0+¨\Ñ',_binary 'M¡,j\Él@‹´>0\â',_binary 'Uš·@wMøƒA°°qF\Ñ','Second task',NULL,_binary 'ªó\È2-\åM¤—ó—ZLoœ','HIGH',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 10:51:06','2026-02-18 16:00:49'),(_binary 'ZÀ\"5JİšGºMM{úõ',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','create payment page',NULL,_binary 'rC,\ê$\nM3\ïd;he','MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 12:11:14','2026-02-17 17:21:09'),(_binary 'e}\Æ*\ÏöIŒ¸´\Ø\ç \ãµH',_binary '\×\ÕbÎG^ŸK¨0pXı\'',_binary '}A\0vÀñOY©\r–±³\Úö','Task 2',NULL,_binary 'ë”‘Y9}GJ\ÌI‚¨Ä®','HIGH',_binary '£.z|œJq«–µ+9û–\î','[\"1fa32e7a-7c9c-4a71-ab96-b52b39fb96ee\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,'2026-03-25',NULL,0,NULL,NULL,'2026-03-22 19:10:13','2026-03-23 17:08:53'),(_binary 'i`\ïb:úGzªö—\á?86',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','ddsd','sdsd',_binary 'ª¹ñ•F˜¬ònwÕ²¤5','MEDIUM',NULL,NULL,NULL,_binary 'z#\Õm|˜O¥6I¶[—',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 18:04:36','2026-02-17 19:08:59'),(_binary 'sULM;şA©“‹ı–!\ë.',_binary 'M¡,j\Él@‹´>0\â',_binary 'Uš·@wMøƒA°°qF\Ñ','Welcome task','First task from seed',_binary 'Y\Õi\Â8?Jv˜²l\r|D0','MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 10:51:06','2026-02-17 10:51:06'),(_binary '–cp\ícZGr³¥ve\Ô2\å',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','rrrr','rrrrr',_binary 'û w(^Mg‡<\å€AB','MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 12:08:22','2026-02-17 12:08:28'),(_binary '¡u\ÔM!HÓƒš\Ğ\Ï\í”&',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','dddd','dddd',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 11:50:03','2026-02-17 11:50:03'),(_binary '¨Op\î­YG ¿±moŠx¶',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','Create a login page','Create a login page with forgot password , sign up',_binary 'ª¹ñ•F˜¬ònwÕ²¤5','HIGH',_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','[\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"7a23d56d-7c98-4fa5-9036-4913b6075b97\"]','[{\"id\":\"5a47a470-1640-469a-b6bc-690c33847ee5\",\"title\":\"Create a login page\",\"completed\":false,\"assigneeId\":\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"dueDate\":\"2026-02-19\",\"priority\":\"HIGH\"},{\"id\":\"7108c99c-605c-4a83-9752-9c5bb0fc6739\",\"title\":\"Craete forgot password\",\"completed\":false,\"assigneeId\":\"7a23d56d-7c98-4fa5-9036-4913b6075b97\",\"dueDate\":\"2026-02-19\",\"priority\":\"HIGH\"},{\"id\":\"4b53685f-842c-4f9a-b0ae-c9120a1aafa0\",\"title\":\"Create signup page\",\"completed\":false,\"assigneeId\":\"7a23d56d-7c98-4fa5-9036-4913b6075b97\",\"dueDate\":\"2026-02-19\",\"priority\":\"HIGH\"}]',_binary 'z#\Õm|˜O¥6I¶[—',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-18 07:47:29','2026-02-18 07:49:42'),(_binary '­\ëÚ¶\æIÎŒAôv\ÃTK',_binary 'M¡,j\Él@‹´>0\â',_binary 'Uš·@wMøƒA°°qF\Ñ','Task 1','dssd',_binary 'Y\Õi\Â8?Jv˜²l\r|D0','MEDIUM',NULL,NULL,NULL,_binary 'z#\Õm|˜O¥6I¶[—',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 17:12:50','2026-02-17 17:12:50'),(_binary 'Á8b7–@®¢\êC¦Xz0',_binary '+;‡\Ç^MøŠ§™™%-\æI',_binary 'Uš·@wMøƒA°°qF\Ñ','Task 1',NULL,_binary 'Nc\æ5•™DÑ‹­\Â\0üvc§','HIGH',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 13:22:59','2026-03-22 14:34:00'),(_binary 'Å“\×[D¿°¸Hd½3',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','fff','ffff',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 11:58:07','2026-02-17 11:58:07'),(_binary '\Æt61IˆöN\\Á+\í',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','kkn','ssss',_binary 'rC,\ê$\nM3\ïd;he','MEDIUM',NULL,NULL,NULL,_binary 'z#\Õm|˜O¥6I¶[—',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 18:05:22','2026-02-17 18:41:45'),(_binary '\Ç*‡»m1E~¤\×?\çxHx',_binary '\×\ÕbÎG^ŸK¨0pXı\'',_binary '}A\0vÀñOY©\r–±³\Úö','Task 1',NULL,_binary 'I\Ä JO‘³\rğk…«\Ë','MEDIUM',_binary 'ßˆR™vB\éš$³ªKÒ€t','[\"df885299-7690-42e9-9a24-b3aa4bd28074\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 19:05:38','2026-03-23 17:05:53'),(_binary '\Èú“©ò#IL‚1\ä\ß&3\æ',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','zxzx','zxxzzx',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 11:48:38','2026-02-17 11:48:38'),(_binary '\Ğ\Ùd¸\ÛI_„Š4t–>$',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','Pillar Work important','Complete Pillar work',_binary '0ô\\˜4¹DW•	Fè¥','MEDIUM',_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','[\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]','[{\"id\":\"2f6c9a52-c592-4c53-8b93-e684ea78ca9f\",\"title\":\"Task 1\",\"completed\":true,\"assigneeId\":\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"dueDate\":\"2026-02-19\",\"priority\":\"MEDIUM\"},{\"id\":\"5bcc5abe-d8df-4b37-96c9-a28eb62bff30\",\"title\":\"Task 2\",\"completed\":false,\"assigneeId\":\"7a23d56d-7c98-4fa5-9036-4913b6075b97\",\"dueDate\":\"2026-02-27\",\"priority\":\"MEDIUM\"},{\"id\":\"07dc8032-1c12-435b-94fc-e0080d10e55c\",\"title\":\"Task 3\",\"completed\":true,\"priority\":\"MEDIUM\"},{\"id\":\"bfe17842-eab7-46f6-a460-d8abbe9cdd9f\",\"title\":\"Task 4\",\"completed\":false,\"priority\":\"CRITICAL\"},{\"id\":\"49d03563-4fb7-4c75-81eb-e38cf760e276\",\"title\":\"Task 5\",\"completed\":false,\"priority\":\"MEDIUM\"}]',_binary 'z#\Õm|˜O¥6I¶[—',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-18 06:57:30','2026-02-18 07:54:31'),(_binary '\Òı!\Üÿ[HS¿5‘Ê­‚$',_binary '\×\ÕbÎG^ŸK¨0pXı\'',_binary '}A\0vÀñOY©\r–±³\Úö','Task 4',NULL,NULL,'LOW',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 19:43:18','2026-03-24 02:55:53'),(_binary '×œ\ÌJLTªHFL6\æ',_binary '+;‡\Ç^MøŠ§™™%-\æI',_binary 'Uš·@wMøƒA°°qF\Ñ','Task 2',NULL,_binary '\áœLV9\äAêª‚òô•\ÔCg','MEDIUM',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 13:23:10','2026-03-22 15:16:56'),(_binary '\Ù\Ú\áW¨ñI½1÷,\Îñğ',_binary '\ï\áñ(H\ä»m\Ã#!\Ó',_binary '±Ç¨\çZG>¥D–D´]¾\"','Task A',NULL,NULL,'MEDIUM',NULL,NULL,NULL,_binary 'œ¥ƒ\Ø$J¤°;„OL\èen',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary '\Û\î\Ã\Í\Ë\İJ¸¡n\ÖX9½U',_binary '+;‡\Ç^MøŠ§™™%-\æI',_binary 'Uš·@wMøƒA°°qF\Ñ','Task 2',NULL,_binary '\áœLV9\äAêª‚òô•\ÔCg','MEDIUM',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]',NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 13:35:45','2026-03-22 15:16:56'),(_binary '\İAŞ‹@C4¤Hg¯¤',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','cvdfdf','dffdd',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 11:59:33','2026-02-17 11:59:33'),(_binary '\ç6\Ş\ï¹\ÑL1©\Û\æ\ë\èÓ¯',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','Create a login page with validation of fields','Create a login page with validation of fields',_binary '0ô\\˜4¹DW•	Fè¥','HIGH',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 12:10:05','2026-02-17 12:10:05'),(_binary '\çƒVö³8Oj‡iW_æ²',_binary 'ªô(ø¡xB\ã¹÷	6µ\È',_binary 'Uš·@wMøƒA°°qF\Ñ','sdds','sdsdds',_binary '0ô\\˜4¹DW•	Fè¥','MEDIUM',NULL,NULL,NULL,_binary 'z#\Õm|˜O¥6I¶[—',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 17:20:59','2026-02-17 17:20:59'),(_binary '\éK\ÆVó\'E\è…—•\Ùdc³',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:',_binary 'ŠB\Ë\röBŒŒh°º.Ä›','Second task',NULL,_binary '~nK \à1OF£ÁYœ‚Q ','HIGH',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\",\"7a23d56d-7c98-4fa5-9036-4913b6075b97\"]','[{\"id\":\"b9da0f98-8426-472e-9123-20eb6a79effe\",\"title\":\"Confirm API contracts\",\"completed\":false,\"assigneeId\":\"7a23d56d-7c98-4fa5-9036-4913b6075b97\",\"priority\":\"HIGH\",\"dueDate\":\"2026-03-23\"},{\"id\":\"eaa0731e-4095-484b-8806-bba441789c62\",\"title\":\"Ship first board polish\",\"completed\":false,\"assigneeId\":\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\",\"priority\":\"CRITICAL\",\"dueDate\":\"2026-03-25\"}]',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 12:11:31','2026-03-22 12:11:31'),(_binary 'ì™\Ô\æBM(¸‚oö!¶\ÆB',_binary '+;‡\Ç^MøŠ§™™%-\æI',_binary 'Uš·@wMøƒA°°qF\Ñ','Task 3','<p>Amitabh Bachchan[a] (n&eacute; Srivastava;[1] born 11 October 1942)[7] is an Indian actor who works in Hindi cinema. Widely considered one of the greatest, most accomplished and commercially successful actors in the history of Indian Cinema,[8] he has starred in over 200 films. Bachchan has been called as the Shahenshah of Bollywood, Sadi ke Mahanayak (translated as superstar of the century in Hindi), Bollywood\'s Star of the Millennium, or simply Big B.[9] His dominance in the Indian film industry during the 1970s&ndash;80s led the French director Fran&ccedil;ois Truffaut to describe it as a \"one-man industry\".[10] He is a recipient of several accolades including six National Film Awards and sixteen Filmfare Awards &amp; one South Filmfare award.&nbsp; &nbsp;</p>',_binary '\áœLV9\äAêª‚òô•\ÔCg','MEDIUM',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]','[{\"id\":\"67a8a871-7d23-465a-9072-af86f976d91b\",\"title\":\"sub task 1\",\"completed\":false,\"dueDate\":\"2026-03-23\",\"priority\":\"LOW\"},{\"id\":\"016129e4-1013-400e-97a1-d3b988586ae5\",\"title\":\"sub task 2\",\"completed\":false,\"dueDate\":\"2026-03-24\",\"priority\":\"LOW\"}]',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,8,'2026-03-28',NULL,0,NULL,NULL,'2026-03-22 13:35:57','2026-03-22 14:28:10'),(_binary 'õ \è˜\×M	™,\í¿(\Ò\ë|',_binary '/)d3„DŠ\ì\à§&S\07',_binary '\Ñğ\í\ZB’«\ÊL´Eö“','xxzzx','zxxzxz',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-02-17 11:48:31','2026-02-17 11:48:31'),(_binary 'ø	„„tI:·Ê˜w¹{……',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:',_binary 'ŠB\Ë\röBŒŒh°º.Ä›','Welcome task','First task from seed',_binary '\ØBƒğd•Cø¢‹Nœ‘¸\Ö','MEDIUM',NULL,'[\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]','[{\"id\":\"f184aab0-c28d-49fb-8350-0f21249d618a\",\"title\":\"Review onboarding checklist\",\"completed\":true,\"assigneeId\":\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\",\"priority\":\"LOW\",\"dueDate\":\"2026-03-23\"},{\"id\":\"d386b514-8822-4f7a-b832-339bcead9235\",\"title\":\"Set initial priorities\",\"completed\":false,\"assigneeId\":\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"priority\":\"MEDIUM\",\"dueDate\":\"2026-03-25\"}]',_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³',NULL,NULL,NULL,NULL,0,NULL,NULL,'2026-03-22 12:11:31','2026-03-22 12:11:31');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` binary(16) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` text,
  `google_id` varchar(64) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar_url` text,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `onboarding_completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (_binary 'œ¥ƒ\Ø$J¤°;„OL\èen','User A','security-test-a@example.com','$2b$10$10H.MojYZwWPYD8Xlv4CHuHFaXoVRPQEW8GCVpPxw4hRU6X4sm7Bm',NULL,NULL,NULL,0,1,NULL,'2026-02-17 08:21:43','2026-02-17 08:21:43',NULL),(_binary '£.z|œJq«–µ+9û–\î','Casey Nguyen','ps.member06@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=15',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary '%¼\á+\rIõˆ\Ùkıÿ’2','Taylor Brooks','ps.member04@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=13',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary ')»¹h?øAô±\ØX$g‰','Avery Kim','ps.member10@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=19',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary 'Fx’\Û^iL,ƒ\r-‘bÒµ','Seed Member','member@example.com','Password123!',NULL,NULL,NULL,1,1,NULL,'2026-02-17 10:51:05','2026-03-22 12:11:31',NULL),(_binary 'HMö9\ØOFºV¹[n¹€','Alex Rivera','ps.member01@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=10',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary 'Oš#şµ\ĞOX©\Ä.º\İ^»‘','Jamie Foster','ps.member08@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=17',1,1,'2026-03-25 08:28:33','2026-03-22 20:21:18','2026-03-25 08:28:32',NULL),(_binary 'dB¤\rÆ¡N•š\åq2\à…\Ì','Riley Patel','ps.member05@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=14',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary 'e\ãS”‰\rKoŒ‚\Èñ\Z=º³','Seed Owner','owner@example.com','Password123!',NULL,NULL,'/api/v1/users/avatar/65e35394-890d-4b6f-8c82-c8f11a3dbab3',1,1,'2026-03-25 03:14:03','2026-02-17 10:51:05','2026-03-25 03:14:02',NULL),(_binary 'z#\Õm|˜O¥6I¶[—','Seed Admin','admin@example.com','Password123!',NULL,NULL,NULL,1,1,NULL,'2026-02-17 15:13:21','2026-03-22 12:11:31',NULL),(_binary '}ó‘ı\ÜK~ˆ¹OVÏ­ük','Pankaj Kumar Agarwal','pankaj.kumar.119eng@gmail.com','$2b$10$lrftT2NpM0hCdtPN6Cz3nOt/Npl.HPQ0cmn/0eYA8ZX25S5dDsBWS',NULL,NULL,NULL,0,1,NULL,'2026-02-17 16:51:29','2026-02-17 16:51:29',NULL),(_binary '¬H»…´Dúª=œ)v>\ê¿','Throttle Test User','throttle-test@example.com','$2b$10$EpeRNXlN5G0KQ.kY8nRGGORCvQPDb4qSDVx7ph1Jvk9SF4tfMn6ou',NULL,NULL,NULL,0,1,NULL,'2026-02-17 08:21:37','2026-02-17 08:21:37',NULL),(_binary '®;\Ê\âj»C]¹®bE\nq°\ä','Morgan Silva','ps.member07@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=16',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary '\ÂR\ÚÀG\ï…Qü©N†9','Quinn Murphy','ps.member09@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=18',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary 'Ô’\çLA©²e«‚}\Ã}¶','User B','security-test-b@example.com','$2b$10$10H.MojYZwWPYD8Xlv4CHuHFaXoVRPQEW8GCVpPxw4hRU6X4sm7Bm',NULL,NULL,NULL,0,1,NULL,'2026-02-17 08:21:43','2026-02-17 08:21:43',NULL),(_binary 'ßˆR™vB\éš$³ªKÒ€t','Sam Okonkwo','ps.member03@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=12',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary '\é\ãp³On†9şğAú\ä','Jordan Chen','ps.member02@example.com','Password123!',NULL,NULL,'https://i.pravatar.cc/300?img=11',1,1,NULL,'2026-03-22 20:21:18','2026-03-22 20:21:18',NULL),(_binary '\î\Éu*óF ¨)d¡{Á','pankaj.7613','pankaj.7613@gmail.com','$2b$10$E3pHvSMYBlvF6VCKAvTjNurma2LyLQJy2oYviMhHf3skIcs0PSqmS',NULL,NULL,NULL,0,1,NULL,'2026-02-17 15:33:48','2026-02-17 15:33:48',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflow_statuses`
--

DROP TABLE IF EXISTS `workflow_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_statuses` (
  `id` binary(16) NOT NULL,
  `workflow_id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `position` int NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_position` (`workflow_id`,`position`),
  CONSTRAINT `fk_status_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflow_statuses`
--

LOCK TABLES `workflow_statuses` WRITE;
/*!40000 ALTER TABLE `workflow_statuses` DISABLE KEYS */;
INSERT INTO `workflow_statuses` VALUES (_binary 'Á„Y¸Io³\êŸMd¼\Ğ',_binary '÷CZÇ‘O\ë…F‚ñ\ÒZ»?','In Progress',1,NULL,'IN_PROGRESS'),(_binary '\r\Â~:{C>¦\êÔˆ‰¤	',_binary '‹\Z¸“O\íBŠ¨\0÷¥ »\á‰','In Progress',1,NULL,'IN_PROGRESS'),(_binary '\"\ÄB^sDÑ‘\Ë\"o@½',_binary '¸®\\\àˆ#L2©\åh÷\'õ`','To Do',0,NULL,'TODO'),(_binary '%17\åIœŒHpÁy §',_binary '÷CZÇ‘O\ë…F‚ñ\ÒZ»?','Done',2,NULL,'DONE'),(_binary '0ô\\˜4¹DW•	Fè¥',_binary 'ôYM‚A$´v5+46—\ã','To Do',0,NULL,'TODO'),(_binary 'I\Ä JO‘³\rğk…«\Ë',_binary '‹\Z¸“O\íBŠ¨\0÷¥ »\á‰','Done',2,NULL,'DONE'),(_binary 'Nc\æ5•™DÑ‹­\Â\0üvc§',_binary '¸®\\\àˆ#L2©\åh÷\'õ`','In Progress',1,NULL,'IN_PROGRESS'),(_binary 'Y\Õi\Â8?Jv˜²l\r|D0',_binary 'ô‡\ÓtP\îMš½ÎºH{\n¦(','To Do',0,NULL,'TODO'),(_binary 'Z;)mP†D¯Šú=ò•8%',_binary '=Š9\'\ïCI·i\Â\Ó,]\Û','In Progress',1,NULL,'IN_PROGRESS'),(_binary '_È¥y†LIf•\à„\Ö÷2­\Ø',_binary '=Š9\'\ïCI·i\Â\Ó,]\Û','To Do',0,NULL,'TODO'),(_binary 'rC,\ê$\nM3\ïd;he',_binary 'ôYM‚A$´v5+46—\ã','Done',2,NULL,'DONE'),(_binary 'v[­l\Ú1H¤¡\Ë./\î°',_binary '÷CZÇ‘O\ë…F‚ñ\ÒZ»?','To Do',0,NULL,'TODO'),(_binary '~nK \à1OF£ÁYœ‚Q ',_binary ',U«ñ\ÏCTš\İ\Ï7J>‹','In Progress',1,NULL,'IN_PROGRESS'),(_binary 'ˆ«id„	N ˜ W\Ò³ú\è',_binary 'ªŒ\ßA4G º>(¾’ôÊ¢','To Do',0,NULL,'TODO'),(_binary 'ª¹ñ•F˜¬ònwÕ²¤5',_binary 'ôYM‚A$´v5+46—\ã','In Progress',1,NULL,'IN_PROGRESS'),(_binary 'ªó\È2-\åM¤—ó—ZLoœ',_binary 'ô‡\ÓtP\îMš½ÎºH{\n¦(','In Progress',1,NULL,'IN_PROGRESS'),(_binary '±\Å\âKC\ĞGE‹5,=¢Y\Íÿ',_binary 'ªŒ\ßA4G º>(¾’ôÊ¢','In Progress',1,NULL,'IN_PROGRESS'),(_binary '\ÉG\"=7\ÉL1¾.\ÂBN\0',_binary 'ªŒ\ßA4G º>(¾’ôÊ¢','Done',2,NULL,'DONE'),(_binary '\ØBƒğd•Cø¢‹Nœ‘¸\Ö',_binary ',U«ñ\ÏCTš\İ\Ï7J>‹','To Do',0,NULL,'TODO'),(_binary '\áœLV9\äAêª‚òô•\ÔCg',_binary '¸®\\\àˆ#L2©\åh÷\'õ`','Done',2,NULL,'DONE'),(_binary '\èDú÷\\\ãO¥‹¤°®ºA\È',_binary 'ô‡\ÓtP\îMš½ÎºH{\n¦(','Done',2,NULL,'DONE'),(_binary 'ë”‘Y9}GJ\ÌI‚¨Ä®',_binary '‹\Z¸“O\íBŠ¨\0÷¥ »\á‰','To Do',0,NULL,'TODO'),(_binary 'ó;ª\\N\æŠ5–+z\î\ÛÁ',_binary ',U«ñ\ÏCTš\İ\Ï7J>‹','Done',2,NULL,'DONE'),(_binary 'û w(^Mg‡<\å€AB',_binary '=Š9\'\ïCI·i\Â\Ó,]\Û','Done',2,NULL,'DONE');
/*!40000 ALTER TABLE `workflow_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflows`
--

DROP TABLE IF EXISTS `workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflows` (
  `id` binary(16) NOT NULL,
  `project_id` binary(16) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_workflow_project` (`project_id`),
  CONSTRAINT `fk_workflow_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflows`
--

LOCK TABLES `workflows` WRITE;
/*!40000 ALTER TABLE `workflows` DISABLE KEYS */;
INSERT INTO `workflows` VALUES (_binary ',U«ñ\ÏCTš\İ\Ï7J>‹',_binary 'y¹\í\è.FCÂ«¸#VE\"\Õ:','Default',1),(_binary '=Š9\'\ïCI·i\Â\Ó,]\Û',_binary '/)d3„DŠ\ì\à§&S\07','Default',1),(_binary '‹\Z¸“O\íBŠ¨\0÷¥ »\á‰',_binary '\×\ÕbÎG^ŸK¨0pXı\'','Default',1),(_binary 'ªŒ\ßA4G º>(¾’ôÊ¢',_binary '¡_w€%wM\ì`|ñ6','Default',1),(_binary '¬hL»CJ•qğ øº',_binary '¾Q&\ÂHãª±Lw{9','Default',1),(_binary '¸®\\\àˆ#L2©\åh÷\'õ`',_binary '+;‡\Ç^MøŠ§™™%-\æI','Default',1),(_binary 'ôYM‚A$´v5+46—\ã',_binary 'ªô(ø¡xB\ã¹÷	6µ\È','Default',1),(_binary 'ô‡\ÓtP\îMš½ÎºH{\n¦(',_binary 'M¡,j\Él@‹´>0\â','Default',1),(_binary '÷CZÇ‘O\ë…F‚ñ\ÒZ»?',_binary 'õVó\Æ\è-Dj­B\Î\"›\Å^¦','Default',1),(_binary 'şB\ï£kùHŠJû™4iº',_binary '\ï\áñ(H\ä»m\Ã#!\Ó','Default',1);
/*!40000 ALTER TABLE `workflows` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-25 13:58:38
