-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: srmss
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `buses`
--

DROP TABLE IF EXISTS `buses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `buses` (
  `bus_id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(11) NOT NULL COMMENT 'Foreign key link to general vehicle logs',
  `bus_code` varchar(50) NOT NULL COMMENT 'Internal identifier e.g., BUS-001',
  `capacity` int(11) NOT NULL DEFAULT 40 COMMENT 'Seating allocation capacity',
  `service_type` enum('Luxury','Semi-Luxury','Normal','AC','Non-AC') DEFAULT 'Normal',
  `status` enum('Available','Assigned','In Service','Maintenance','Deactivated') DEFAULT 'Available',
  PRIMARY KEY (`bus_id`),
  UNIQUE KEY `vehicle_id` (`vehicle_id`),
  UNIQUE KEY `bus_code` (`bus_code`),
  CONSTRAINT `fk_buses_vehicles` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `buses`
--

LOCK TABLES `buses` WRITE;
/*!40000 ALTER TABLE `buses` DISABLE KEYS */;
INSERT INTO `buses` VALUES (1,1,'BUS-001',50,'Semi-Luxury','Available'),(2,2,'BUS-002',45,'Luxury','Available'),(3,3,'BUS-003',55,'Semi-Luxury','Available');
/*!40000 ALTER TABLE `buses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `depots`
--

DROP TABLE IF EXISTS `depots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `depots` (
  `depot_id` int(11) NOT NULL AUTO_INCREMENT,
  `depot_name` varchar(100) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`depot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `depots`
--

LOCK TABLES `depots` WRITE;
/*!40000 ALTER TABLE `depots` DISABLE KEYS */;
INSERT INTO `depots` VALUES (1,'Main Depot','Colombo','Mohamed Ihthisham','0785502952','mohamedihthisham17@gmail.com','NO:20 Main Street Colombo 11','2026-06-12 08:52:35');
/*!40000 ALTER TABLE `depots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_assignments`
--

DROP TABLE IF EXISTS `driver_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `driver_assignments` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) DEFAULT NULL,
  `driver_id` int(11) DEFAULT NULL,
  `assignment_date` date DEFAULT NULL,
  `shift_start_time` time DEFAULT NULL,
  `shift_end_time` time DEFAULT NULL,
  `status` enum('Assigned','Active','Completed') DEFAULT NULL,
  PRIMARY KEY (`assignment_id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `driver_assignments_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`),
  CONSTRAINT `driver_assignments_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_assignments`
--

LOCK TABLES `driver_assignments` WRITE;
/*!40000 ALTER TABLE `driver_assignments` DISABLE KEYS */;
INSERT INTO `driver_assignments` VALUES (1,1,1,'2026-11-30','08:00:00','16:00:00','Active');
/*!40000 ALTER TABLE `driver_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drivers` (
  `driver_id` int(11) NOT NULL AUTO_INCREMENT,
  `depot_id` int(11) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `license_expiry_date` date DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`driver_id`),
  UNIQUE KEY `license_number` (`license_number`),
  KEY `depot_id` (`depot_id`),
  CONSTRAINT `drivers_ibfk_1` FOREIGN KEY (`depot_id`) REFERENCES `depots` (`depot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES (1,1,'Jagath','Perera','jagath@gmail.com',NULL,'12563250','2027-12-05','1993-10-02','chillaw',1,'2026-06-12 14:33:05');
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fuel_records`
--

DROP TABLE IF EXISTS `fuel_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fuel_records` (
  `fuel_id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(11) DEFAULT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `fuel_quantity` decimal(10,2) DEFAULT NULL,
  `fuel_cost` decimal(10,2) DEFAULT NULL,
  `fuel_type` varchar(50) DEFAULT NULL,
  `fuel_date` date DEFAULT NULL,
  `fuel_time` time DEFAULT NULL,
  `odometer_reading` decimal(10,2) DEFAULT NULL,
  `fuel_efficiency` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`fuel_id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `trip_id` (`trip_id`),
  CONSTRAINT `fuel_records_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`),
  CONSTRAINT `fuel_records_ibfk_2` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`trip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fuel_records`
--

LOCK TABLES `fuel_records` WRITE;
/*!40000 ALTER TABLE `fuel_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `fuel_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_alerts`
--

DROP TABLE IF EXISTS `maintenance_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maintenance_alerts` (
  `alert_id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(11) DEFAULT NULL,
  `alert_type` varchar(100) DEFAULT NULL,
  `alert_message` text DEFAULT NULL,
  `is_resolved` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`alert_id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `maintenance_alerts_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_alerts`
--

LOCK TABLES `maintenance_alerts` WRITE;
/*!40000 ALTER TABLE `maintenance_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_records`
--

DROP TABLE IF EXISTS `maintenance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maintenance_records` (
  `maintenance_id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(11) DEFAULT NULL,
  `maintenance_type` varchar(100) DEFAULT NULL,
  `maintenance_date` date DEFAULT NULL,
  `maintenance_time` time DEFAULT NULL,
  `description` text DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `performed_by` varchar(100) DEFAULT NULL,
  `maintenance_status` enum('Scheduled','In Progress','Completed') DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  PRIMARY KEY (`maintenance_id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `maintenance_records_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_records`
--

LOCK TABLES `maintenance_records` WRITE;
/*!40000 ALTER TABLE `maintenance_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recurrence_rules`
--

DROP TABLE IF EXISTS `recurrence_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recurrence_rules` (
  `rule_id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_code_prefix` varchar(100) NOT NULL,
  `depot_id` int(11) DEFAULT NULL,
  `route_id` int(11) DEFAULT NULL,
  `schedule_type` varchar(50) DEFAULT NULL,
  `departure_time` time NOT NULL,
  `expected_arrival_time` time NOT NULL,
  `recurrence_type` enum('Daily','Weekly','Monthly') NOT NULL,
  `recurrence_value` varchar(255) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recurrence_rules`
--

LOCK TABLES `recurrence_rules` WRITE;
/*!40000 ALTER TABLE `recurrence_rules` DISABLE KEYS */;
INSERT INTO `recurrence_rules` VALUES (1,'Route-01',1,1,'Standard','07:00:00','08:00:00','Weekly','1,2,3','2026-06-15','2026-06-17','2026-06-14 17:58:24'),(4,'SCH-WKD-238',1,2,'Standard','06:00:00','09:00:00','Daily',NULL,'2026-06-15','2026-06-15','2026-06-14 19:14:42');
/*!40000 ALTER TABLE `recurrence_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'SUPER_ADMIN','Full system access'),(2,'ADMIN','');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `route_stops`
--

DROP TABLE IF EXISTS `route_stops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `route_stops` (
  `stop_id` int(11) NOT NULL AUTO_INCREMENT,
  `route_id` int(11) DEFAULT NULL,
  `stop_sequence` int(11) DEFAULT NULL,
  `stop_name` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  `distance_from_start` decimal(10,2) DEFAULT NULL,
  `estimated_arrival_time` int(11) DEFAULT NULL,
  PRIMARY KEY (`stop_id`),
  KEY `route_id` (`route_id`),
  CONSTRAINT `route_stops_ibfk_1` FOREIGN KEY (`route_id`) REFERENCES `routes` (`route_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `route_stops`
--

LOCK TABLES `route_stops` WRITE;
/*!40000 ALTER TABLE `route_stops` DISABLE KEYS */;
INSERT INTO `route_stops` VALUES (1,NULL,2,'Matara Town',6.972100,79.256300,50.00,60),(2,1,3,'Badulla Town',6.923600,75.236100,200.00,300);
/*!40000 ALTER TABLE `route_stops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routes`
--

DROP TABLE IF EXISTS `routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `routes` (
  `route_id` int(11) NOT NULL AUTO_INCREMENT,
  `depot_id` int(11) DEFAULT NULL,
  `route_code` varchar(50) DEFAULT NULL,
  `route_name` varchar(100) DEFAULT NULL,
  `start_location` varchar(100) DEFAULT NULL,
  `end_location` varchar(100) DEFAULT NULL,
  `total_distance` decimal(10,2) DEFAULT NULL,
  `total_stops` int(11) DEFAULT NULL,
  `estimated_duration` int(11) DEFAULT NULL,
  `default_bus_id` int(11) DEFAULT NULL,
  `default_driver_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`route_id`),
  UNIQUE KEY `route_code` (`route_code`),
  KEY `depot_id` (`depot_id`),
  KEY `default_bus_id` (`default_bus_id`),
  KEY `default_driver_id` (`default_driver_id`),
  CONSTRAINT `routes_fk_bus_asset` FOREIGN KEY (`default_bus_id`) REFERENCES `buses` (`bus_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `routes_fk_driver_roster` FOREIGN KEY (`default_driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `routes_ibfk_1` FOREIGN KEY (`depot_id`) REFERENCES `depots` (`depot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routes`
--

LOCK TABLES `routes` WRITE;
/*!40000 ALTER TABLE `routes` DISABLE KEYS */;
INSERT INTO `routes` VALUES (1,1,'RT-001','Colombo Highway','Colombo Fort','Kaluthura Main Stop',20.00,10,40,2,1,1,'2026-06-12 19:06:50'),(2,1,'RT-002','Kandy Highway','Colombo Fort','Kandy Bus Top',150.00,80,176,1,1,1,'2026-06-13 19:23:57');
/*!40000 ALTER TABLE `routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_conflicts`
--

DROP TABLE IF EXISTS `schedule_conflicts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schedule_conflicts` (
  `conflict_id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) DEFAULT NULL,
  `conflicting_with` int(11) DEFAULT NULL,
  `conflict_type` varchar(100) DEFAULT NULL,
  `conflict_description` text DEFAULT NULL,
  `severity` enum('Low','Medium','High','Critical') DEFAULT NULL,
  `is_resolved` tinyint(1) DEFAULT 0,
  `detected_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`conflict_id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `conflicting_with` (`conflicting_with`),
  CONSTRAINT `schedule_conflicts_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`),
  CONSTRAINT `schedule_conflicts_ibfk_2` FOREIGN KEY (`conflicting_with`) REFERENCES `schedules` (`schedule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_conflicts`
--

LOCK TABLES `schedule_conflicts` WRITE;
/*!40000 ALTER TABLE `schedule_conflicts` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_conflicts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schedules` (
  `schedule_id` int(11) NOT NULL AUTO_INCREMENT,
  `recurrence_rule_id` int(11) DEFAULT NULL,
  `recurring_group_id` varchar(50) DEFAULT NULL,
  `depot_id` int(11) DEFAULT NULL,
  `route_id` int(11) DEFAULT NULL,
  `schedule_code` varchar(100) DEFAULT NULL,
  `schedule_date` date DEFAULT NULL,
  `schedule_type` varchar(50) DEFAULT NULL,
  `departure_time` time DEFAULT NULL,
  `expected_arrival_time` time DEFAULT NULL,
  `status` enum('Scheduled','Active','Completed','Cancelled','Delayed','Maintenance') DEFAULT 'Scheduled',
  `created_by` int(11) DEFAULT NULL,
  `is_emergency` tinyint(1) DEFAULT 0,
  `emergency_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`schedule_id`),
  UNIQUE KEY `schedule_code` (`schedule_code`),
  KEY `depot_id` (`depot_id`),
  KEY `route_id` (`route_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`depot_id`) REFERENCES `depots` (`depot_id`),
  CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`route_id`) REFERENCES `routes` (`route_id`),
  CONSTRAINT `schedules_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedules`
--

LOCK TABLES `schedules` WRITE;
/*!40000 ALTER TABLE `schedules` DISABLE KEYS */;
INSERT INTO `schedules` VALUES (1,NULL,NULL,1,1,'SCH-WKD-098','2026-06-13','Moring Route','06:00:00','07:30:00','Maintenance',NULL,0,NULL),(66,NULL,NULL,1,2,'SCH-WKD-235','2026-06-11','Standard','07:00:00','08:00:00','Completed',NULL,0,'Immediate dispatch emergency hold activated.'),(67,1,'GRP-1781459904606-591',1,1,'Route-01-20260615','2026-06-12','Standard','07:00:00','08:00:00','Maintenance',NULL,0,'Immediate dispatch emergency hold activated.'),(68,1,'GRP-1781459904606-591',1,1,'Route-01-20260616','2026-06-16','Standard','07:00:00','08:00:00','Scheduled',NULL,0,NULL),(69,1,'GRP-1781459904606-591',1,1,'Route-01-20260617','2026-06-17','Standard','07:00:00','08:00:00','Scheduled',NULL,0,NULL),(70,4,'GRP-1781464482410-417',1,2,'SCH-WKD-238-20260615','2026-06-10','Standard','06:00:00','09:00:00','Scheduled',NULL,0,''),(71,NULL,NULL,1,2,'SCH-WKD-250','2026-06-16','Standard','05:45:00','08:00:00','Scheduled',NULL,0,NULL),(72,NULL,NULL,1,2,'SCH-WKD-270','2026-06-28','Moring Route','08:00:00','09:30:00','Scheduled',NULL,0,NULL),(73,NULL,NULL,1,2,'RT001_20260619_001','2026-06-19','Regular','08:10:00','10:30:00','Scheduled',NULL,0,NULL),(74,NULL,NULL,1,1,'MOR_20260615_001','2026-06-15','Regular','08:00:00','11:30:00','',NULL,0,NULL),(75,NULL,NULL,1,1,'EVE_20260615_002','2026-06-15','Regular','17:00:00','20:30:00','Completed',NULL,0,NULL),(76,NULL,NULL,1,1,'MOR_20260616_001','2026-06-16','Regular','08:00:00','11:30:00','Scheduled',NULL,0,NULL),(77,NULL,NULL,1,1,'EVE_20260616_002','2026-06-16','Regular','17:00:00','20:30:00','Scheduled',NULL,0,NULL),(78,NULL,NULL,1,1,'MOR_20260617_001','2026-06-17','Regular','08:00:00','11:30:00','Scheduled',NULL,0,NULL),(79,NULL,NULL,1,1,'EVE_20260617_002','2026-06-17','Regular','17:00:00','20:30:00','Scheduled',NULL,0,NULL),(80,NULL,NULL,1,1,'MOR_20260618_001','2026-06-18','Regular','08:00:00','11:30:00','Scheduled',NULL,0,NULL),(81,NULL,NULL,1,1,'EVE_20260618_002','2026-06-18','Regular','17:00:00','20:30:00','Scheduled',NULL,0,NULL),(82,NULL,NULL,1,1,'MOR_20260619_001','2026-06-19','Regular','08:00:00','11:30:00','Scheduled',NULL,0,NULL),(83,NULL,NULL,1,1,'EVE_20260619_002','2026-06-19','Regular','17:00:00','20:30:00','Scheduled',NULL,0,NULL),(84,NULL,NULL,1,1,'MOR_20260620_001','2026-06-20','Regular','08:00:00','11:30:00','Scheduled',NULL,0,NULL),(85,NULL,NULL,1,1,'EVE_20260620_002','2026-06-20','Regular','17:00:00','20:30:00','Scheduled',NULL,0,NULL),(86,NULL,NULL,1,1,'MOR_20260621_001','2026-06-21','Regular','08:00:00','11:30:00','Scheduled',NULL,0,NULL),(87,NULL,NULL,1,1,'EVE_20260621_002','2026-06-21','Regular','17:00:00','20:30:00','Scheduled',NULL,0,NULL);
/*!40000 ALTER TABLE `schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'smtp_host','smtp.gmail.com','2026-06-15 14:03:36'),(2,'smtp_port','587','2026-06-15 14:03:37'),(3,'smtp_user','mohamedihthisham17@gmail.com','2026-06-15 14:03:37'),(4,'smtp_secure','tls','2026-06-15 14:03:37'),(5,'smtp_from_name','SRMSS System','2026-06-15 14:03:37'),(6,'smtp_from_email','mohamedihthisham17@gmail.com','2026-06-15 14:03:37'),(7,'smtp_password','','2026-06-15 14:03:37');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trips`
--

DROP TABLE IF EXISTS `trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trips` (
  `trip_id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) DEFAULT NULL,
  `vehicle_id` int(11) DEFAULT NULL,
  `driver_id` int(11) DEFAULT NULL,
  `trip_date` date DEFAULT NULL,
  `departure_time` time DEFAULT NULL,
  `arrival_time` time DEFAULT NULL,
  `actual_departure_time` time DEFAULT NULL,
  `actual_arrival_time` time DEFAULT NULL,
  `trip_status` enum('Scheduled','In Progress','Completed','Delayed','Cancelled') DEFAULT NULL,
  `passengers_count` int(11) DEFAULT NULL,
  `route_distance` decimal(10,2) DEFAULT NULL,
  `fuel_consumed` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`trip_id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `trips_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`),
  CONSTRAINT `trips_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`),
  CONSTRAINT `trips_ibfk_3` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trips`
--

LOCK TABLES `trips` WRITE;
/*!40000 ALTER TABLE `trips` DISABLE KEYS */;
INSERT INTO `trips` VALUES (1,67,2,1,'2026-06-12','09:00:00','09:45:00','09:10:00','10:00:00','In Progress',30,35.00,25.00),(9,68,1,1,'2026-06-17','00:00:00','00:00:00','00:00:00','00:00:00','Delayed',20,35.00,20.00),(13,1,1,1,'2026-06-19','09:30:00','12:30:00','09:30:00','12:45:00','Completed',40,150.00,35.50);
/*!40000 ALTER TABLE `trips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `depot_id` int(11) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `depot_id` (`depot_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`depot_id`) REFERENCES `depots` (`depot_id`),
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,1,1,'superadmin',NULL,'$2b$10$JSrqAGLu1CX6Ad2MoVgQ3uOfJs35OzLcWQ2OfjKmYLjaHK8Qg5t.W',NULL,NULL,NULL,1,'2026-06-12 08:53:33'),(3,1,2,'ihthi','mohamedihthisham17@gmail.com','$2b$10$iOsUDS1z8DWvMdB6PHFRyeo6BKl3MkXOBdsUCHYDSRFR9l20kDFGW','Mohamed','Ihthisham','+94785502952',1,'2026-06-12 13:51:51');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_assignments`
--

DROP TABLE IF EXISTS `vehicle_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicle_assignments` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) DEFAULT NULL,
  `vehicle_id` int(11) DEFAULT NULL,
  `assignment_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `status` enum('Assigned','In Use','Completed') DEFAULT NULL,
  PRIMARY KEY (`assignment_id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `vehicle_assignments_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`),
  CONSTRAINT `vehicle_assignments_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_assignments`
--

LOCK TABLES `vehicle_assignments` WRITE;
/*!40000 ALTER TABLE `vehicle_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicles` (
  `vehicle_id` int(11) NOT NULL AUTO_INCREMENT,
  `depot_id` int(11) DEFAULT NULL,
  `registration_number` varchar(50) NOT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `manufacturer` varchar(50) DEFAULT NULL,
  `model_year` year(4) DEFAULT NULL,
  `seating_capacity` int(11) DEFAULT NULL,
  `total_mileage` decimal(10,2) DEFAULT NULL,
  `current_fuel_level` decimal(10,2) DEFAULT NULL,
  `fuel_tank_capacity` decimal(10,2) DEFAULT NULL,
  `status` enum('Available','Assigned','In Service','Maintenance') DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`vehicle_id`),
  UNIQUE KEY `registration_number` (`registration_number`),
  KEY `depot_id` (`depot_id`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`depot_id`) REFERENCES `depots` (`depot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (1,1,'WP-02630','Bus','Layland',2019,50,15.00,NULL,NULL,'Available',NULL,NULL,'2026-06-13 12:53:07'),(2,1,'C-15362','Bus','Layland',2020,45,20.00,NULL,NULL,'Available',NULL,NULL,'2026-06-13 19:25:10'),(3,1,'NW-3265','Bus','Layland',2021,55,18.00,NULL,NULL,'Available',NULL,NULL,'2026-06-15 12:18:49');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-15 19:34:41
