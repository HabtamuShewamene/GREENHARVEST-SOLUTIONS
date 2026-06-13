// Abstract Builder
interface VehicleBuilder {
    void buildFrame();
    void buildEngine();
    void buildWheels();
    Vehicle getVehicle();
}
 
// Concrete Builder - Car
class CarBuilder implements VehicleBuilder {
    private Vehicle car = new Vehicle();
    public void buildFrame()   { car.setFrame("Car Frame"); }
    public void buildEngine()  { car.setEngine("Car Engine"); }
    public void buildWheels()  { car.setWheels(4); }
    public Vehicle getVehicle() { return car; }
}
 
// Concrete Builder - Bike
class BikeBuilder implements VehicleBuilder {
    private Vehicle bike = new Vehicle();
    public void buildFrame()   { bike.setFrame("Bike Frame"); }
    public void buildEngine()  { bike.setEngine("No Engine"); }
    public void buildWheels()  { bike.setWheels(2); }
    public Vehicle getVehicle() { return bike; }
}

 
// Director
class VehicleDirector {
    public Vehicle construct(VehicleBuilder builder) {
        builder.buildFrame();
        builder.buildEngine();
        builder.buildWheels();
        return builder.getVehicle();
    }
}
 
// Client
public class Main {
    public static void main(String[] args) {
        VehicleDirector director = new VehicleDirector();
 
        VehicleBuilder carBuilder = new CarBuilder();
        Vehicle car = director.construct(carBuilder);
        System.out.println(car); // Car Frame, Car Engine, 4 Wheels
 
        VehicleBuilder bikeBuilder = new BikeBuilder();
        Vehicle bike = director.construct(bikeBuilder);
        System.out.println(bike); // Bike Frame, No Engine, 2 Wheels
    }
}

 
