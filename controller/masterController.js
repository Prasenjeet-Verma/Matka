
// EJS TEMPLATE SNIPPETS FOR masterpaneldashboard.ejs

// ✔ To Render All Visible Users (Masters, Agents, Users)
// <table>
//   <thead>
//     <tr>
//       <th>Username</th>
//       <th>Role</th>
//       <th>Wallet</th>
//       <th>Referral Code</th>
//     </tr>
//   </thead>

//   <tbody>
//     <% visibleUsers.forEach(u => { %>
//       <tr>
//         <td><%= u.username %></td>
//         <td><%= u.role %></td>
//         <td><%= u.wallet %></td>
//         <td><%= u.referCode %></td>
//       </tr>
//     <% }) %>
//   </tbody>
// </table>


// ✔ If You Want to Render Only Masters
// Show only masters:
// <% visibleUsers
//     .filter(u => u.role === "master")
//     .forEach(master => { %>

//     <p><%= master.username %></p>

// <% }) %>