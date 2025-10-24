import { registerCustomer } from '../services/customerService.js';
import customerRepo from '../repositories/customerRepo.js';
import { AppError } from '../utils/misc.js';
import { describe, jest } from '@jest/globals';

// jest.mock('../repositories/customerRepo.js');

// describe('customerService', () => {
//   const customerData = {
//     firstName: 'John',
//     lastName: 'Doe',
//     email: 'john@example.com',
//     phone: '+1234567890',
//     dob: '1990-01-01',
//     gender: 'Male',
//     password: 'Password123',
//     address: { street_address: '123 St', city: 'City', state: 'State', pin: '12345' },
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('registers a new customer with address', async () => {
//     customerRepo.checkEmailExists.mockResolvedValue(false);
//     customerRepo.createCustomer.mockResolvedValue({ ...customerData, _id: '123', addresses: [{ ...customerData.address, address_label: 'Home', contact_phone: customerData.phone }] });

//     const customer = await registerCustomer(customerData);
//     expect(customerRepo.createCustomer).toHaveBeenCalledWith(expect.objectContaining({
//       ...customerData,
//       addresses: [{ ...customerData.address, address_label: 'Home', contact_phone: customerData.phone }],
//     }));
//   });

//   // it('throws error if email exists', async () => {
//   //   customerRepo.checkEmailExists.mockResolvedValue(true);
//   //   await expect(registerCustomer(customerData)).rejects.toThrow(new AppError(409, 'Email already in use'));
//   // });
// });

/*
{ "firstName": "John", 
  "lastName": "Doe", 
  "email": "john@example.com", 
  "phone": "+1234567890", 
  "dob": "1990-01-01", 
  "gender": "Male", 
  "password": "Password123", 
  "address": {"street_address": "123 St", "city": "City", "state": "State", "pin": "12345" } }
*/


// const mockUser = {
//    firstName: "John", 
//     lastName: "Doe", 
//     email: "john@example.com", 
//     phone: "+1234567890", 
//     dob: "1990-01-01", 
//     gender: "Male", 
//     password: "Password123", 
//     address: {street_address: "123 St", city: "City", state: "State", pin: "12345" } 
// }



// const mockRequest = {
//   body: mockUser

// };

// const mockResponse = {

// };

// describe("Register Customer", () => {
//   it("should create a new user for valid user", () => {

//   });
// });