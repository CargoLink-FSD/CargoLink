import Order from '../models/order.js';


const countOrdersByCustomer = async (customerId) => {
  return  Order.aggregate()
    .match({ customer_id: customerId })
    .group({ _id :"$status", count: { $sum:1 }})
};

const countOrdersByTransporter = async (transporterId) => {
  return  Order.aggregate()
    .match({ transporter_id: transporterId })
    .group({ _id :"$status", count: { $sum:1 }})
};




export default {
    countOrdersByCustomer,
    countOrdersByTransporter,
}