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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '9d467318-c2c2-11f0-a514-f5199abbdb16:1-10942,
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
INSERT INTO `activity_logs` VALUES (_binary 'MãZ7@¨§ÕΩ\ÎMç\ﬁ',_binary 'Uö∑@wM¯ÉA∞∞qF\—',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','project',_binary 'M°,j\…l@ã¥>0\‚','create','{\"name\": \"Seed Project\"}','2026-02-17 10:51:06');
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
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
INSERT INTO `custom_fields` VALUES (_binary '\‚\"q\ÏC[£\œ˚\“_\Zù\r',_binary '\Ô\·Ò(Hû\‰ªm\√#!\”','Field1','TEXT',0);
/*!40000 ALTER TABLE `custom_fields` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,1739812800000,'CreateOrganizationInvitations1739812800000'),(2,1760000000000,'AddTaskAssigneeIds1760000000000'),(3,1760000001000,'AddTaskSubtasks1760000001000');
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
INSERT INTO `notifications` VALUES (_binary 'T!à>*ùEüïD˜®\ÃÛñ',_binary '‘í\ÁLA©≤e´Ç}\√}∂','For User B',NULL,1,'2026-02-17 08:21:43'),(_binary 'íÒoìÖGläı,)\Î%ı',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','Welcome','Seed notification',0,'2026-02-17 10:51:06');
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
INSERT INTO `organization_invitations` VALUES (_binary '+∂.\ÍBFÿ¶]â¥iK¯:',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','6733b6ece1569348abf056bb3641911b2e98d7434c709515c96b6b8337e14222',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:44:47','2026-02-17 16:44:46'),(_binary '.\‰µMGµ®yµ\÷ÿøé',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','6377bd04a745fa9e666e471036065614bc6e459b28dd922d4b998979c1cbf6cf',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:11:06','2026-02-17 16:11:06'),(_binary ' \€KyO≈™\ÌôrÉM\r',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','2aeb5a8d1cd4437a1c7220524958fab43483b38589e554ad78dc97d470d94866',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:41:16','2026-02-17 16:41:16'),(_binary '=Ä;ﬁù\ÏJ\n¢A+EXPe',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','6cb9d31cd5766dcb5bb579385ab52b28bef38fdab0195e78004057c79ce87f15',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:31:01','2026-02-17 16:31:00'),(_binary '@™\–;	qFí∂˜Íé¶î\—x',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.7613@gmail.com','member','1b368ae676552d55f5fb418cad5df0a39577f56622cee0dd0e08379cc81e22fb',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 15:30:46','2026-02-17 15:30:46'),(_binary 'Av¿ü2CKÖ&#å3˙',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','66081a7ce374903e7be914ac4dc55df0cd67f7614f46e6609c36494b0bb52f51',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:05:49','2026-02-17 16:05:49'),(_binary 'IÇ\÷^cF3™]\Î\\q@P',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.7613@gmail.com','member','795f279b58ef49fb600b9d001b04b0a8d7b2b6a31fe0716612a8daa87b9824a3',_binary 'z#\’m|òO•ê6I∂[ó','PENDING','2026-02-24 15:51:54','2026-02-17 15:51:54'),(_binary '§¥ˆûJUKCí°©n∞uL',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.7613@gmail.com','member','ac56441596d4eaf516d3083cbc35f173afe25df073b042f91982ee53eee60606',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 15:37:11','2026-02-17 15:37:10'),(_binary '®óÙ?F\Ïø)ÙÙ\›qMW',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.7613@gmail.com','member','f62edcae073e9744fb0808662eb331a8359c17fc56a52dd6a433d4b3b7ff2023',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 15:16:09','2026-02-17 15:14:55'),(_binary '∏æo3I~ûYpÖÑh¶',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','65197e402ab4e8e0d794ddf39c52e97a43b209a31048317ce65e782cd11231fd',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:20:13','2026-02-17 16:20:13'),(_binary 'º*{åMµ∑U=\Ï\Z\r',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','06eca27dc0f2b2058c08b958da3ad9fc6c8430630cb42bc293d7d1f205a5dc88',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 15:57:49','2026-02-17 15:57:48'),(_binary 'Ω¨Q\–e1NúïsQ¢5ı\—¸',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','d84f96669ce8d89909fb748cb7f2e173e25a51ae7a4b31a9e8c54af8ac78e9b4',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:26:31','2026-02-17 16:26:30'),(_binary '\Ã>ß•UÉH$≠n-æ?ró',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','c16bdba239a03ef656e22659c3a351f83414a24847f1a771124132bd2663d6bb',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:16:38','2026-02-17 16:16:37'),(_binary '\–F\ÿ$ãü@Éo6ÜJÕπ',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.76131@gmail.com','member','dfab279e6ce8785568c81c531f497ebfb2c76b296a843873f8207b5610ba07ef',_binary 'z#\’m|òO•ê6I∂[ó','PENDING','2026-02-24 15:16:27','2026-02-17 15:16:26'),(_binary '⁄äÚæπ\€Fê\Á\¬ ñ<X',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','16cbf33431d8a574bddf528235a7fdbf69e8c9046e616b50e3a5afd1a2de6ffb',_binary 'z#\’m|òO•ê6I∂[ó','ACCEPTED','2026-02-24 16:51:04','2026-02-17 16:51:03'),(_binary '\Èl%4J\Ìõ\Óbá\—¯x',_binary 'Uö∑@wM¯ÉA∞∞qF\—','pankaj.kumar.119eng@gmail.com','member','a28a5890d4456f8ae765f48a38d7e5e3a4d9c45e19ba837c7940bb093d4b5855',_binary 'z#\’m|òO•ê6I∂[ó','CANCELLED','2026-02-24 16:19:25','2026-02-17 16:19:25');
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
INSERT INTO `organization_members` VALUES (_binary '\Â\À,(CΩÇq\»BYÆK',_binary 'íqGæ\‡Dßú\Î4∑5[àj',_binary '¨HªÖ¥D˙™=ú)v>\Íø','admin','ACTIVE','2026-02-17 08:21:37'),(_binary 'F\Ÿ\ƒfE˝ä!\n\"ì=(',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','owner','ACTIVE','2026-02-17 10:58:36'),(_binary 'ïÇs≥•AUé\Ô\‡0DM\‡',_binary '\n\À\ 1õ*F9¢?\‹f9≥9',_binary '‘í\ÁLA©≤e´Ç}\√}∂','admin','ACTIVE','2026-02-17 08:21:43'),(_binary '<†Ω_µGÖê±∞8]Òz',_binary 'Uö∑@wM¯ÉA∞∞qF\—',_binary 'z#\’m|òO•ê6I∂[ó','admin','ACTIVE','2026-02-17 15:13:21'),(_binary 'E!jl\›9I$≠˘$≠,%',_binary 'Uö∑@wM¯ÉA∞∞qF\—',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','owner','ACTIVE','2026-02-17 10:51:05'),(_binary 'ù\⁄uÄoúM¶à`àÕ≠l',_binary 'Uö∑@wM¯ÉA∞∞qF\—',_binary 'Fxí\€^iL,É\ré-ëb“µ','member','ACTIVE','2026-02-17 10:51:05'),(_binary '\–\Í\ÍÉMò•r©¿ä\Ë\«˜',_binary 'Uö∑@wM¯ÉA∞∞qF\—',_binary '}Ûë˝\‹K~àπOVœ≠¸k','member','ACTIVE','2026-02-17 16:51:29'),(_binary '¯7]u\ÕO´ö\Óo\⁄ZJoÛ',_binary '±«®\ÁZG>•DñD¥]æ\"',_binary 'ú•É\ÿ$J§∞;ÑOL\Ëen','admin','ACTIVE','2026-02-17 08:21:43');
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
  `owner_id` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_org_owner` (`owner_id`),
  CONSTRAINT `fk_org_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizations`
--

LOCK TABLES `organizations` WRITE;
/*!40000 ALTER TABLE `organizations` DISABLE KEYS */;
INSERT INTO `organizations` VALUES (_binary '±«®\ÁZG>•DñD¥]æ\"','Org A','org-a-security-1771316503972',_binary 'ú•É\ÿ$J§∞;ÑOL\Ëen','2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary '\n\À\ 1õ*F9¢?\‹f9≥9','Org B','org-b-security-1771316503972',_binary '‘í\ÁLA©≤e´Ç}\√}∂','2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary 'Uö∑@wM¯ÉA∞∞qF\—','Seed Org','seed-org-1771325465982',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 10:51:05','2026-02-17 10:51:05'),(_binary 'íqGæ\‡Dßú\Î4∑5[àj','Throttle Org','throttle-org-1771316497594',_binary '¨HªÖ¥D˙™=ú)v>\Íø','2026-02-17 08:21:37','2026-02-17 08:21:37'),(_binary 'ôY¯\r\Á*L	ÆßèÃ†pº\0','Seecog Softwares private limited','seecog',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 10:53:23','2026-02-17 10:53:23'),(_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','Hcl Technologies','hcl',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 10:58:36','2026-02-17 10:58:36'),(_binary '\Ë\ÿ˚\ÎBjä-\÷O8\∆f†','Seecog softwares private limited','seecog-softwares',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 10:52:33','2026-02-17 10:52:33');
/*!40000 ALTER TABLE `organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` binary(16) NOT NULL,
  `invoice_id` binary(16) NOT NULL,
  `payment_gateway` varchar(100) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_payment_invoice` (`invoice_id`),
  CONSTRAINT `fk_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (_binary 'òb\0^ã°Bìò`éIlk','Free',NULL,'monthly',3,5,NULL,1,'2026-02-17 10:51:06'),(_binary 'ö%ì\Á\≈\»CJø£tæ™H¨%','Enterprise',25.00,'monthly',NULL,NULL,NULL,1,'2026-02-17 10:51:06'),(_binary '\·à˜O8çNú¨¢èR™h\»l','Pro',10.00,'monthly',20,50,NULL,1,'2026-02-17 10:51:06');
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
INSERT INTO `project_members` VALUES (_binary '\"\’#r˝\“Ax§∂n∏\–Hä',_binary 'M°,j\…l@ã¥>0\‚',_binary '}Ûë˝\‹K~àπOVœ≠¸k','CONTRIBUTOR'),(_binary 'ÑwW≤Gz¢_≥‘´4ª',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Fxí\€^iL,É\ré-ëb“µ','VIEWER'),(_binary '†\Õb\ \”\ÿB”Ö8\Âïiñç±',_binary 'M°,j\…l@ã¥>0\‚',_binary 'z#\’m|òO•ê6I∂[ó','ADMIN'),(_binary '\≈aÇÒ\ﬁ\’KÑá8z∑}\ Gf',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','CONTRIBUTOR'),(_binary '\Ë\Ï`;]jI<¥˝DP˚•\≈',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'z#\’m|òO•ê6I∂[ó','ADMIN');
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
INSERT INTO `projects` VALUES (_binary 'M°,j\…l@ã¥>0\‚',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Seed Project','Created by seed','PRIVATE',0,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 10:51:06','2026-02-17 10:51:06'),(_binary '`L\‡\Ó_NH£ú~Hñ\…P~K',_binary 'íqGæ\‡Dßú\Î4∑5[àj','Throttle Project',NULL,'PRIVATE',0,_binary '¨HªÖ¥D˙™=ú)v>\Íø','2026-02-17 08:21:37','2026-02-17 08:21:37'),(_binary 'ô<[s\Î@\Z´Emãté%Ç',_binary '\n\À\ 1õ*F9¢?\‹f9≥9','Project B',NULL,'PRIVATE',0,_binary '‘í\ÁLA©≤e´Ç}\√}∂','2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','Project 1','project 1 des','PRIVATE',0,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 11:13:36','2026-02-17 11:13:36'),(_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','mini crm tool','mini crm tool description','PRIVATE',0,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 12:09:15','2026-02-17 12:09:15'),(_binary 'æQ&\¬H„™±Lwç{9',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','Mini HR 360','Mini HR 360 description','PRIVATE',0,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 12:50:50','2026-02-17 12:50:50'),(_binary '\Ô\·Ò(Hû\‰ªm\√#!\”',_binary '±«®\ÁZG>•DñD¥]æ\"','Project A',NULL,'PRIVATE',0,_binary 'ú•É\ÿ$J§∞;ÑOL\Ëen','2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary 'ıVÛ\∆\Ë-Dj≠B\Œ\"õ\≈^¶',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','Mini Crm 360','Mini Crm 360 description','PRIVATE',0,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','2026-02-17 13:10:13','2026-02-17 13:10:13');
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
INSERT INTO `sprints` VALUES (_binary '´8Pò+7FÒ´óC˘6Ú,˝',_binary '\Ô\·Ò(Hû\‰ªm\√#!\”','Sprint 1',NULL,NULL,'PLANNED','2026-02-17 08:21:43'),(_binary '\‰\”:†ÛãO\ZåÃÅ\Ã6\ËhÅ',_binary 'M°,j\…l@ã¥>0\‚','Sprint 1',NULL,NULL,'PLANNED','2026-02-17 10:51:06');
/*!40000 ALTER TABLE `sprints` ENABLE KEYS */;
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
INSERT INTO `subscriptions` VALUES (_binary '\'¬ÑY\…GãÄvÉ˙íg',_binary 'Uö∑@wM¯ÉA∞∞qF\—',_binary 'òb\0^ã°Bìò`éIlk','ACTIVE','2026-02-17',NULL,'2026-03-03','2026-02-17 10:51:06');
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
INSERT INTO `tasks` VALUES (_binary 'FäR\ÊLKâ^Æ‹ªœì',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Create The dashboard page','Create The dashboard page with proper ui',_binary '0Ù\\ò4πDWï	ûFË•ù','HIGH',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 12:10:31','2026-02-17 15:04:40'),(_binary '2´\nˆGeå•\€˘≠˙K\ ',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','ddd','ddd',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 11:50:17','2026-02-17 11:50:17'),(_binary '&[⁄ãR#I…ö<)¢	n°',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','Take vegetables from market','Take vegetables from market alu, govi etc',NULL,'HIGH',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 11:48:09','2026-02-17 11:48:09'),(_binary '(ˆ%4J@èáR*™ö',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Task 11','Task 11 Description',_binary '0Ù\\ò4πDWï	ûFË•ù','CRITICAL',_binary 'Fxí\€^iL,É\ré-ëb“µ',NULL,NULL,_binary 'z#\’m|òO•ê6I∂[ó',NULL,NULL,NULL,NULL,0,NULL,'2026-02-18 02:52:15','2026-02-18 02:52:15'),(_binary 'LG\‚√•\–L]ò\‚°0+®\—',_binary 'M°,j\…l@ã¥>0\‚',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Second task',NULL,_binary '™Û\»2-\ÂM§óÛóZLoú','HIGH',_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 10:51:06','2026-02-17 10:51:06'),(_binary 'Z¿\"5J›öG∫MM{˙ı',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','create payment page',NULL,_binary 'rC,\Í$\nMù3\Ôd;he','MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 12:11:14','2026-02-17 17:21:09'),(_binary 'i`\Ôb:˙Gz™ˆó\·?86',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','ddsd','sdsd',_binary '™πÒïçFò¨Únw’≤§5','MEDIUM',NULL,NULL,NULL,_binary 'z#\’m|òO•ê6I∂[ó',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 18:04:36','2026-02-17 19:08:59'),(_binary 'sULM;˛A©ìã˝ñ!\Î.',_binary 'M°,j\…l@ã¥>0\‚',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Welcome task','First task from seed',_binary 'Y\’i\¬8?Jvò≤l\r|D0ç','MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 10:51:06','2026-02-17 10:51:06'),(_binary 'ñcp\ÌcZGr≥•ve\‘2\Â',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','rrrr','rrrrr',_binary '˚ w(^MgÅèá<\ÂÄAB','MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 12:08:22','2026-02-17 12:08:28'),(_binary '°u\‘M!H”Éö\–\œ\Ìî&',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','dddd','dddd',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 11:50:03','2026-02-17 11:50:03'),(_binary '®Op\Ó≠YG ø±moäx∂',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Create a login page','Create a login page with forgot password , sign up',_binary '™πÒïçFò¨Únw’≤§5','HIGH',_binary 'Fxí\€^iL,É\ré-ëb“µ','[\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"7a23d56d-7c98-4fa5-9036-4913b6075b97\"]','[{\"id\":\"5a47a470-1640-469a-b6bc-690c33847ee5\",\"title\":\"Create a login page\",\"completed\":false,\"assigneeId\":\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"dueDate\":\"2026-02-19\",\"priority\":\"HIGH\"},{\"id\":\"7108c99c-605c-4a83-9752-9c5bb0fc6739\",\"title\":\"Craete forgot password\",\"completed\":false,\"assigneeId\":\"7a23d56d-7c98-4fa5-9036-4913b6075b97\",\"dueDate\":\"2026-02-19\",\"priority\":\"HIGH\"},{\"id\":\"4b53685f-842c-4f9a-b0ae-c9120a1aafa0\",\"title\":\"Create signup page\",\"completed\":false,\"assigneeId\":\"7a23d56d-7c98-4fa5-9036-4913b6075b97\",\"dueDate\":\"2026-02-19\",\"priority\":\"HIGH\"}]',_binary 'z#\’m|òO•ê6I∂[ó',NULL,NULL,NULL,NULL,0,NULL,'2026-02-18 07:47:29','2026-02-18 07:49:42'),(_binary '≠\Î⁄∂\ÊIŒåAÙv\√TK',_binary 'M°,j\…l@ã¥>0\‚',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Task 1','dssd',_binary 'Y\’i\¬8?Jvò≤l\r|D0ç','MEDIUM',NULL,NULL,NULL,_binary 'z#\’m|òO•ê6I∂[ó',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 17:12:50','2026-02-17 17:12:50'),(_binary '≈ì\◊[Dø∞∏êHdΩ3',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','fff','ffff',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 11:58:07','2026-02-17 11:58:07'),(_binary '\∆t61IàˆN\\¡+\Ì',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','kkn','ssss',_binary 'rC,\Í$\nMù3\Ôd;he','MEDIUM',NULL,NULL,NULL,_binary 'z#\’m|òO•ê6I∂[ó',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 18:05:22','2026-02-17 18:41:45'),(_binary '\»˙ì©Ú#ILÇ1\‰\ﬂ&3\Ê',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','zxzx','zxxzzx',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 11:48:38','2026-02-17 11:48:38'),(_binary '\–\Ÿd∏\€I_Ñä4tñ>$',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Pillar Work important','Complete Pillar work',_binary '0Ù\\ò4πDWï	ûFË•ù','MEDIUM',_binary 'Fxí\€^iL,É\ré-ëb“µ','[\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"65e35394-890d-4b6f-8c82-c8f11a3dbab3\"]','[{\"id\":\"2f6c9a52-c592-4c53-8b93-e684ea78ca9f\",\"title\":\"Task 1\",\"completed\":true,\"assigneeId\":\"467892db-5e69-4c2c-830d-8e2d9162d2b5\",\"dueDate\":\"2026-02-19\",\"priority\":\"MEDIUM\"},{\"id\":\"5bcc5abe-d8df-4b37-96c9-a28eb62bff30\",\"title\":\"Task 2\",\"completed\":false,\"assigneeId\":\"7a23d56d-7c98-4fa5-9036-4913b6075b97\",\"dueDate\":\"2026-02-27\",\"priority\":\"MEDIUM\"},{\"id\":\"07dc8032-1c12-435b-94fc-e0080d10e55c\",\"title\":\"Task 3\",\"completed\":true,\"priority\":\"MEDIUM\"},{\"id\":\"bfe17842-eab7-46f6-a460-d8abbe9cdd9f\",\"title\":\"Task 4\",\"completed\":false,\"priority\":\"CRITICAL\"},{\"id\":\"49d03563-4fb7-4c75-81eb-e38cf760e276\",\"title\":\"Task 5\",\"completed\":false,\"priority\":\"MEDIUM\"}]',_binary 'z#\’m|òO•ê6I∂[ó',NULL,NULL,NULL,NULL,0,NULL,'2026-02-18 06:57:30','2026-02-18 07:54:31'),(_binary '\Ÿ\⁄\·W®ÒIΩ1˜,\ŒÒ',_binary '\Ô\·Ò(Hû\‰ªm\√#!\”',_binary '±«®\ÁZG>•DñD¥]æ\"','Task A',NULL,NULL,'MEDIUM',NULL,NULL,NULL,_binary 'ú•É\ÿ$J§∞;ÑOL\Ëen',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary '\›Aﬁã@CÅ4§HgØ§',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','cvdfdf','dffdd',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 11:59:33','2026-02-17 11:59:33'),(_binary '\Á6\ﬁ\Ôπ\—L1©\€\Ê\Î\Ë”ûØ',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','Create a login page with validation of fields','Create a login page with validation of fields',_binary '0Ù\\ò4πDWï	ûFË•ù','HIGH',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 12:10:05','2026-02-17 12:10:05'),(_binary '\ÁÉVˆ≥8OjáiW_Êç≤',_binary '™Ù(¯°xB\„π˜	6µ\»',_binary 'Uö∑@wM¯ÉA∞∞qF\—','sdds','sdsdds',_binary '0Ù\\ò4πDWï	ûFË•ù','MEDIUM',NULL,NULL,NULL,_binary 'z#\’m|òO•ê6I∂[ó',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 17:20:59','2026-02-17 17:20:59'),(_binary 'ı†\Ëò\◊M	ô,\Ìø(\“\Î|',_binary 'û/)d3ÑDä\Ï\‡ß&S\07',_binary '\—\Ì\ZBí´\ LÅ¥Eˆì','xxzzx','zxxzxz',NULL,'MEDIUM',NULL,NULL,NULL,_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥',NULL,NULL,NULL,NULL,0,NULL,'2026-02-17 11:48:31','2026-02-17 11:48:31');
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
  `avatar_url` text,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (_binary 'ú•É\ÿ$J§∞;ÑOL\Ëen','User A','security-test-a@example.com','$2b$10$10H.MojYZwWPYD8Xlv4CHuHFaXoVRPQEW8GCVpPxw4hRU6X4sm7Bm',NULL,0,1,'2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary 'Fxí\€^iL,É\ré-ëb“µ','Seed Member','member@example.com','$2b$10$2ienoyVd0V1nB/jPUhVePe4Rg04dADX2K55uE4AYgQ8hWElo5..xO',NULL,0,1,'2026-02-17 10:51:05','2026-02-17 10:51:05'),(_binary 'e\„Sîâ\rKoåÇ\»Ò\Z=∫≥','Seed Owner','owner@example.com','$2b$10$2ienoyVd0V1nB/jPUhVePe4Rg04dADX2K55uE4AYgQ8hWElo5..xO',NULL,0,1,'2026-02-17 10:51:05','2026-02-17 10:51:05'),(_binary 'z#\’m|òO•ê6I∂[ó','Seed Admin','admin@example.com','$2b$10$F3bfckrZSNrK6ZsrxFbOpOt9l1QMYSM73uCo3lGtiAfQHez9n2c06',NULL,0,1,'2026-02-17 15:13:21','2026-02-17 15:13:21'),(_binary '}Ûë˝\‹K~àπOVœ≠¸k','Pankaj Kumar Agarwal','pankaj.kumar.119eng@gmail.com','$2b$10$lrftT2NpM0hCdtPN6Cz3nOt/Npl.HPQ0cmn/0eYA8ZX25S5dDsBWS',NULL,0,1,'2026-02-17 16:51:29','2026-02-17 16:51:29'),(_binary '¨HªÖ¥D˙™=ú)v>\Íø','Throttle Test User','throttle-test@example.com','$2b$10$EpeRNXlN5G0KQ.kY8nRGGORCvQPDb4qSDVx7ph1Jvk9SF4tfMn6ou',NULL,0,1,'2026-02-17 08:21:37','2026-02-17 08:21:37'),(_binary '‘í\ÁLA©≤e´Ç}\√}∂','User B','security-test-b@example.com','$2b$10$10H.MojYZwWPYD8Xlv4CHuHFaXoVRPQEW8GCVpPxw4hRU6X4sm7Bm',NULL,0,1,'2026-02-17 08:21:43','2026-02-17 08:21:43'),(_binary '\Ó\…u*ÛF†®)d°{¡','pankaj.7613','pankaj.7613@gmail.com','$2b$10$E3pHvSMYBlvF6VCKAvTjNurma2LyLQJy2oYviMhHf3skIcs0PSqmS',NULL,0,1,'2026-02-17 15:33:48','2026-02-17 15:33:48');
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
INSERT INTO `workflow_statuses` VALUES (_binary '¡ÑY∏Io≥\ÍüMdº\–',_binary '˜CZ«ëO\ÎÖFÇÒ\“Zª?','In Progress',1,NULL,'IN_PROGRESS'),(_binary '%17\ÂIúåHp¡y ß',_binary '˜CZ«ëO\ÎÖFÇÒ\“Zª?','Done',2,NULL,'DONE'),(_binary '0Ù\\ò4πDWï	ûFË•ù',_binary 'ÙYMÇA$¥v5+46ó\„','To Do',0,NULL,'TODO'),(_binary 'Y\’i\¬8?Jvò≤l\r|D0ç',_binary 'Ùá\”tP\ÓMöΩŒ∫H{\n¶(','To Do',0,NULL,'TODO'),(_binary 'Z;)mPÜDØä˙=Úï8%',_binary '=ä9\'\ÔCI∑i\¬\”,]\€','In Progress',1,NULL,'IN_PROGRESS'),(_binary '_»•yÜLIfï\‡Ñ\÷˜2≠\ÿ',_binary '=ä9\'\ÔCI∑i\¬\”,]\€','To Do',0,NULL,'TODO'),(_binary 'rC,\Í$\nMù3\Ôd;he',_binary 'ÙYMÇA$¥v5+46ó\„','Done',2,NULL,'DONE'),(_binary 'v[≠l\⁄1H§°\À./\Ó∞',_binary '˜CZ«ëO\ÎÖFÇÒ\“Zª?','To Do',0,NULL,'TODO'),(_binary '™πÒïçFò¨Únw’≤§5',_binary 'ÙYMÇA$¥v5+46ó\„','In Progress',1,NULL,'IN_PROGRESS'),(_binary '™Û\»2-\ÂM§óÛóZLoú',_binary 'Ùá\”tP\ÓMöΩŒ∫H{\n¶(','In Progress',1,NULL,'IN_PROGRESS'),(_binary '\ËD˙˜\\\„O•ã§∞Æ∫A\»',_binary 'Ùá\”tP\ÓMöΩŒ∫H{\n¶(','Done',2,NULL,'DONE'),(_binary '˚ w(^MgÅèá<\ÂÄAB',_binary '=ä9\'\ÔCI∑i\¬\”,]\€','Done',2,NULL,'DONE');
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
INSERT INTO `workflows` VALUES (_binary '=ä9\'\ÔCI∑i\¬\”,]\€',_binary 'û/)d3ÑDä\Ï\‡ß&S\07','Default',1),(_binary '¨hLªCJïq†¯∫',_binary 'æQ&\¬H„™±Lwç{9','Default',1),(_binary 'ÙYMÇA$¥v5+46ó\„',_binary '™Ù(¯°xB\„π˜	6µ\»','Default',1),(_binary 'Ùá\”tP\ÓMöΩŒ∫H{\n¶(',_binary 'M°,j\…l@ã¥>0\‚','Default',1),(_binary '˜CZ«ëO\ÎÖFÇÒ\“Zª?',_binary 'ıVÛ\∆\Ë-Dj≠B\Œ\"õ\≈^¶','Default',1),(_binary '˛B\Ô£k˘HûäJ˚ô4i∫',_binary '\Ô\·Ò(Hû\‰ªm\√#!\”','Default',1);
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

-- Dump completed on 2026-02-18 14:25:23
