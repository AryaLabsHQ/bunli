// /**
//  * Snapshot tests for visual regression testing
//  */

// import { test, expect, describe } from "bun:test"
// import React from 'react'
// import { Box, Text, Row, Column } from '../../src/index.js'
// import { renderToSnapshot } from '../utils/test-helpers.js'

// describe("Visual Snapshots", () => {
//   test("renders simple box with border", async () => {
//     const output = await renderToSnapshot(
//       <Box width={20} height={5} style={{ border: 'single' }}>
//         <Text>Hello World</Text>
//       </Box>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders double border box", async () => {
//     const output = await renderToSnapshot(
//       <Box width={25} height={6} style={{ border: 'double' }}>
//         <Text>Double Border</Text>
//       </Box>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders round border box", async () => {
//     const output = await renderToSnapshot(
//       <Box width={25} height={6} style={{ border: 'round' }}>
//         <Text>Round Border</Text>
//       </Box>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders horizontal layout", async () => {
//     const output = await renderToSnapshot(
//       <Row width={40} height={8} gap={2}>
//         <Box flex={1} style={{ border: 'single' }}>
//           <Text>Left Panel</Text>
//         </Box>
//         <Box flex={1} style={{ border: 'single' }}>
//           <Text>Right Panel</Text>
//         </Box>
//       </Row>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders vertical layout", async () => {
//     const output = await renderToSnapshot(
//       <Column width={30} height={12} gap={1}>
//         <Box flex={1} style={{ border: 'single' }}>
//           <Text>Top Section</Text>
//         </Box>
//         <Box flex={2} style={{ border: 'single' }}>
//           <Text>Bottom Section</Text>
//         </Box>
//       </Column>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders nested layout", async () => {
//     const output = await renderToSnapshot(
//       <Box width={50} height={15} padding={1} style={{ border: 'double' }}>
//         <Column gap={1}>
//           <Text style={{ bold: true }}>Dashboard</Text>
//           <Row gap={2} flex={1}>
//             <Box flex={1} style={{ border: 'single' }}>
//               <Column padding={1}>
//                 <Text style={{ color: 'cyan' }}>Stats</Text>
//                 <Text>Users: 1,234</Text>
//                 <Text>Revenue: $5,678</Text>
//               </Column>
//             </Box>
//             <Box flex={2} style={{ border: 'single' }}>
//               <Box padding={1}>
//                 <Text style={{ color: 'green' }}>Activity</Text>
//                 <Text>• User logged in</Text>
//                 <Text>• Payment received</Text>
//                 <Text>• New signup</Text>
//               </Box>
//             </Box>
//           </Row>
//         </Column>
//       </Box>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders text alignment", async () => {
//     const output = await renderToSnapshot(
//       <Column width={30} gap={1}>
//         <Box style={{ border: 'single' }}>
//           <Text align="left">Left aligned</Text>
//         </Box>
//         <Box style={{ border: 'single' }}>
//           <Text align="center">Center aligned</Text>
//         </Box>
//         <Box style={{ border: 'single' }}>
//           <Text align="right">Right aligned</Text>
//         </Box>
//       </Column>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders with padding and margin", async () => {
//     const output = await renderToSnapshot(
//       <Box width={40} height={12}>
//         <Box 
//           margin={2}
//           padding={2}
//           style={{ border: 'single', backgroundColor: 'blue' }}
//         >
//           <Text>Padded and Margined Content</Text>
//         </Box>
//       </Box>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders styled text", async () => {
//     const output = await renderToSnapshot(
//       <Box padding={2}>
//         <Text style={{ bold: true }}>Bold Text</Text>
//         <Text style={{ italic: true }}>Italic Text</Text>
//         <Text style={{ underline: true }}>Underlined Text</Text>
//         <Text style={{ strikethrough: true }}>Strikethrough Text</Text>
//         <Text style={{ dim: true }}>Dim Text</Text>
//         <Text style={{ color: 'red' }}>Red Text</Text>
//         <Text style={{ backgroundColor: 'blue' }}>Blue Background</Text>
//       </Box>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
  
//   test("renders complex dashboard layout", async () => {
//     const output = await renderToSnapshot(
//       <Box width={60} height={20} padding={1}>
//         <Column gap={1}>
//           {/* Header */}
//           <Row>
//             <Text style={{ bold: true, fontSize: 'large' }}>📊 Analytics Dashboard</Text>
//             <Box flex={1} />
//             <Text style={{ dim: true }}>Last updated: 5m ago</Text>
//           </Row>
          
//           {/* Main Content */}
//           <Row gap={2} flex={1}>
//             {/* Sidebar */}
//             <Column width={15} gap={1}>
//               <Box style={{ border: 'single' }} padding={1}>
//                 <Text style={{ bold: true }}>Menu</Text>
//               </Box>
//               <Box style={{ border: 'single' }} padding={1} flex={1}>
//                 <Text>• Overview</Text>
//                 <Text>• Analytics</Text>
//                 <Text>• Reports</Text>
//                 <Text>• Settings</Text>
//               </Box>
//             </Column>
            
//             {/* Main Area */}
//             <Column flex={1} gap={1}>
//               {/* Stats Row */}
//               <Row gap={1}>
//                 <Box flex={1} style={{ border: 'single' }} padding={1}>
//                   <Text style={{ color: 'green' }}>Revenue</Text>
//                   <Text style={{ bold: true }}>$12,345</Text>
//                 </Box>
//                 <Box flex={1} style={{ border: 'single' }} padding={1}>
//                   <Text style={{ color: 'blue' }}>Users</Text>
//                   <Text style={{ bold: true }}>1,234</Text>
//                 </Box>
//                 <Box flex={1} style={{ border: 'single' }} padding={1}>
//                   <Text style={{ color: 'yellow' }}>Growth</Text>
//                   <Text style={{ bold: true }}>+12.5%</Text>
//                 </Box>
//               </Row>
              
//               {/* Chart Area */}
//               <Box flex={1} style={{ border: 'double' }} padding={1}>
//                 <Text>Chart Area</Text>
//                 <Text style={{ dim: true }}>████████████░░░░ 75%</Text>
//               </Box>
//             </Column>
//           </Row>
//         </Column>
//       </Box>
//     )
    
//     expect(output).toMatchSnapshot()
//   })
// })