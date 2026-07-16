-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('Furnace', 'Boiler', 'AirHandler', 'RooftopUnit', 'CondensingUnit', 'HeatPump', 'Chiller', 'CoolingTower', 'FanCoilUnit', 'VavBox', 'Pump', 'WaterHeater', 'VentilationFan', 'DuctworkAccessories', 'ControlsThermostat', 'Other');

-- AlterTable
ALTER TABLE "price_list_items" ADD COLUMN     "equipment_type" "EquipmentType",
ADD COLUMN     "item_number" TEXT,
ADD COLUMN     "long_description" TEXT;
